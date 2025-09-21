const DEFAULT_VOLUME = 1;

const playbackState = {
    currentTrack: null,
    queue: [],
    history: [],
    progress: {
        currentTime: 0,
        duration: 0,
        isPlaying: false
    }
};

const stateReady = loadStateFromStorage();
let hasActiveAudioSession = false;

async function loadStateFromStorage() {
    try {
        const stored = await chrome.storage.local.get('playbackState');
        if (stored && stored.playbackState) {
            const { currentTrack = null, queue = [], history = [] } = stored.playbackState;
            playbackState.currentTrack = currentTrack;
            playbackState.queue = Array.isArray(queue) ? queue : [];
            playbackState.history = Array.isArray(history) ? history : [];
            playbackState.progress = {
                currentTime: 0,
                duration: 0,
                isPlaying: false
            };
            hasActiveAudioSession = false;
        }
    } catch (error) {
        // Ignore storage load issues.
    }
}

async function playSound(source = 'default.wav', volume = DEFAULT_VOLUME, discId = null) {
    await createOffscreen();
    await chrome.runtime.sendMessage({ play: { source, volume, discId } }).catch(() => {});
}

async function createOffscreen() {
    if (await chrome.offscreen.hasDocument()) return;
    await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Used to contuine playing music after popup is closed.'
    });
}

function sendToOffscreen(payload) {
    return chrome.offscreen.hasDocument()
        .then(hasDocument => {
            if (!hasDocument) {
                return;
            }
            const maybePromise = chrome.runtime.sendMessage(payload);
            if (maybePromise && typeof maybePromise.catch === 'function') {
                return maybePromise.catch(() => {});
            }
            return undefined;
        })
        .catch(() => {});
}

function getStateSnapshot() {
    return {
        currentTrack: playbackState.currentTrack,
        queue: playbackState.queue,
        history: playbackState.history,
        progress: { ...playbackState.progress }
    };
}

function persistState() {
    const baseState = {
        currentTrack: playbackState.currentTrack,
        queue: playbackState.queue,
        history: playbackState.history
    };

    const operations = [chrome.storage.local.set({ playbackState: baseState }).catch(() => {})];

    if (playbackState.currentTrack) {
        operations.push(chrome.storage.local.set({ currentDiscId: playbackState.currentTrack.discId }).catch(() => {}));
    } else {
        operations.push(chrome.storage.local.remove('currentDiscId').catch(() => {}));
    }

    return Promise.all(operations).catch(() => {});
}

function broadcastState() {
    const snapshot = getStateSnapshot();
    const maybePromise = chrome.runtime.sendMessage({ type: 'stateUpdate', state: snapshot });
    if (maybePromise && typeof maybePromise.catch === 'function') {
        maybePromise.catch(() => {});
    }
}

async function playTrack(track, { pushCurrentToHistory = true } = {}) {
    if (!track) return;

    if (pushCurrentToHistory && playbackState.currentTrack) {
        playbackState.history.push(playbackState.currentTrack);
    }

    playbackState.currentTrack = track;
    playbackState.progress = {
        currentTime: 0,
        duration: 0,
        isPlaying: false
    };

    await playSound(track.path, DEFAULT_VOLUME, track.discId);
    hasActiveAudioSession = true;
    await persistState();
    broadcastState();
}

async function advanceQueue({ shouldStopCurrent = false } = {}) {
    const previousTrack = playbackState.currentTrack;

    if (previousTrack) {
        playbackState.history.push(previousTrack);
    }

    const nextTrack = playbackState.queue.shift();

    if (nextTrack) {
        await persistState();
        await playTrack(nextTrack, { pushCurrentToHistory: false });
    } else {
        playbackState.currentTrack = null;
        playbackState.progress = {
            currentTime: 0,
            duration: 0,
            isPlaying: false
        };
        hasActiveAudioSession = false;
        if (shouldStopCurrent && previousTrack) {
            sendToOffscreen({ stop: true });
        }
        await persistState();
        broadcastState();
    }
}

async function handleControl(command, value) {
    switch (command) {
        case 'toggle':
            if (!playbackState.currentTrack) {
                return;
            }
            if (!hasActiveAudioSession) {
                await playTrack(playbackState.currentTrack, { pushCurrentToHistory: false });
                return;
            }
            sendToOffscreen({ toggle: true });
            break;
        case 'pause':
            sendToOffscreen({ pause: true });
            break;
        case 'resume':
            sendToOffscreen({ resume: true });
            break;
        case 'seekRelative':
            sendToOffscreen({ seekRelative: value });
            break;
        case 'seekTo':
            sendToOffscreen({ seekTo: value });
            break;
        default:
            break;
    }
}

async function handlePlayDisc(message) {
    const { discId, path } = message;
    if (!discId) return;

    const track = { discId, path: path || getAudioPathFromDisc(discId) };
    const pushHistory = Boolean(playbackState.currentTrack && playbackState.currentTrack.discId !== discId);
    await playTrack(track, { pushCurrentToHistory: pushHistory });
}

async function handleQueueDisc(message) {
    const { discId, path } = message;
    if (!discId) return;

    const track = { discId, path: path || getAudioPathFromDisc(discId) };
    playbackState.queue.push(track);
    if (!playbackState.currentTrack) {
        const next = playbackState.queue.shift();
        if (next) {
            await playTrack(next, { pushCurrentToHistory: false });
            return;
        }
    }

    await persistState();
    broadcastState();
}

async function handleRemoveFromQueue(index) {
    if (!Number.isInteger(index) || index < 0 || index >= playbackState.queue.length) return;
    playbackState.queue.splice(index, 1);
    await persistState();
    broadcastState();
}

async function handleReorderQueue(fromIndex, toIndex) {
    if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) return;
    if (fromIndex < 0 || fromIndex >= playbackState.queue.length) return;
    if (toIndex < 0 || toIndex >= playbackState.queue.length) return;
    if (fromIndex === toIndex) return;

    const [moved] = playbackState.queue.splice(fromIndex, 1);
    playbackState.queue.splice(toIndex, 0, moved);
    await persistState();
    broadcastState();
}

async function handleSkipNext() {
    if (playbackState.currentTrack || playbackState.queue.length) {
        await advanceQueue({ shouldStopCurrent: true });
    }
}

async function handleSkipPrevious() {
    if (!playbackState.history.length) return;
    const previousTrack = playbackState.history.pop();

    if (playbackState.currentTrack) {
        playbackState.queue.unshift(playbackState.currentTrack);
    }
    await playTrack(previousTrack, { pushCurrentToHistory: false });
}

async function handleClearQueue() {
    if (!playbackState.queue.length) {
        return;
    }
    playbackState.queue = [];
    await persistState();
    broadcastState();
}

function handleProgressUpdate(message) {
    const { currentTime = 0, duration = 0, isPlaying = false, discId } = message;
    playbackState.progress = {
        currentTime,
        duration,
        isPlaying
    };

    if (discId && (!playbackState.currentTrack || playbackState.currentTrack.discId !== discId)) {
        // Ensure current track stays in sync if offscreen reports a change.
        playbackState.currentTrack = playbackState.currentTrack || { discId, path: getAudioPathFromDisc(discId) };
    }
}

function handlePlaybackStopped(message) {
    const reason = message.reason || 'stopped';

    if (reason === 'ended' || reason === 'error') {
        advanceQueue({ shouldStopCurrent: false }).catch(() => {});
        return;
    }

    if (reason === 'stopped') {
        playbackState.progress = {
            currentTime: 0,
            duration: playbackState.progress.duration,
            isPlaying: false
        };
        hasActiveAudioSession = false;
        persistState().then(() => {
            broadcastState();
        }).catch(() => {});
    }
}

function getAudioPathFromDisc(discId) {
    return `./assets/audio/${discId}.mp3`;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
        await stateReady;

        switch (message.type) {
            case 'playDisc':
                await handlePlayDisc(message);
                break;
            case 'queueDisc':
                await handleQueueDisc(message);
                break;
            case 'removeFromQueue':
                await handleRemoveFromQueue(message.index);
                break;
            case 'reorderQueue':
                await handleReorderQueue(message.fromIndex, message.toIndex);
                break;
            case 'skipNext':
                await handleSkipNext();
                break;
            case 'skipPrevious':
                await handleSkipPrevious();
                break;
            case 'clearQueue':
                await handleClearQueue();
                break;
            case 'control':
                await handleControl(message.command, message.value);
                break;
            case 'requestState':
                sendResponse(getStateSnapshot());
                return;
            case 'progress':
                handleProgressUpdate(message);
                break;
            case 'playbackStopped':
                handlePlaybackStopped(message);
                break;
            default:
                break;
        }
    })().catch(() => {});
    return true;
});

chrome.runtime.onInstalled.addListener(() => {
    persistState();
});
