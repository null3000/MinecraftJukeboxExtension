const nowPlayingLabel = document.getElementById('now-playing');
const playPauseBtn = document.getElementById('play-pause-btn');
const rewindBtn = document.getElementById('rewind-btn');
const forwardBtn = document.getElementById('forward-btn');
const skipPrevBtn = document.getElementById('skip-prev-btn');
const skipNextBtn = document.getElementById('skip-next-btn');
const clearQueueBtn = document.getElementById('clear-queue-btn');
const progressBar = document.getElementById('progress-bar');
const currentTimeLabel = document.getElementById('current-time');
const durationLabel = document.getElementById('duration-time');
const queueList = document.getElementById('queue-list');
const scaleSelect = document.getElementById('ui-scale-select');
const SCALE_OPTIONS = ['small', 'medium', 'large'];
const SCALE_CLASSES = SCALE_OPTIONS.map(option => `scale-${option}`);
const DEFAULT_SCALE = 'small';

let activeDiscId = null;
let isPlaying = false;
let hasActiveTrack = false;
let hasPrevTrack = false;
let hasNextTrack = false;
let isUserSeeking = false;
let queue = [];
let history = [];
let resizeFrameId = null;

function safeRemoveStorageKey(key) {
    try {
        const maybePromise = chrome.storage?.local?.remove?.(key);
        if (maybePromise && typeof maybePromise.catch === 'function') {
            maybePromise.catch(() => {});
        }
    } catch (error) {
        /* ignore failures when storage isn't available */
    }
}

function applyScalePreference(scale = DEFAULT_SCALE, { persist = false } = {}) {
    const normalized = SCALE_OPTIONS.includes(scale) ? scale : DEFAULT_SCALE;

    document.body.classList.remove(...SCALE_CLASSES);
    document.body.classList.add(`scale-${normalized}`);

    if (scaleSelect && scaleSelect.value !== normalized) {
        scaleSelect.value = normalized;
    }

    resizePopupToContent();

    if (persist) {
        chrome.storage.local.set({ uiScale: normalized });
    }
}

function resizePopupToContent() {
    if (resizeFrameId !== null) {
        cancelAnimationFrame(resizeFrameId);
    }

    resizeFrameId = requestAnimationFrame(() => {
        resizeFrameId = null;

        const root = document.documentElement;
        const body = document.body;
        const verticalPadding = parseInt(window.getComputedStyle(body).paddingTop, 10)
            + parseInt(window.getComputedStyle(body).paddingBottom, 10);

        const contentHeight = Math.max(root.scrollHeight, body.scrollHeight) + verticalPadding;
        const contentWidth = Math.max(root.scrollWidth, body.scrollWidth);

        const targetHeight = Math.min(contentHeight, 600);
        const targetWidth = Math.min(Math.max(Math.ceil(contentWidth), 320), 800);

        const widthDelta = window.outerWidth - window.innerWidth;
        const heightDelta = window.outerHeight - window.innerHeight;

        const resizedHeight = targetHeight + heightDelta;
        const resizedWidth = targetWidth + widthDelta;

        window.resizeTo(Math.ceil(resizedWidth), Math.ceil(resizedHeight));
    });
}

if (scaleSelect) {
    scaleSelect.addEventListener('change', event => {
        applyScalePreference(event.target.value, { persist: true });
    });
}

applyScalePreference(DEFAULT_SCALE);

function getAudioPath(discId) {
    return `./assets/audio/${discId}.mp3`;
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) {
        return '0:00';
    }
    const totalSeconds = Math.floor(seconds);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updateControlsState({ hasTrack = hasActiveTrack, hasPrev = hasPrevTrack, hasNext = hasNextTrack } = {}) {
    hasActiveTrack = hasTrack;
    hasPrevTrack = hasPrev;
    hasNextTrack = hasNext;

    [playPauseBtn, rewindBtn, forwardBtn].forEach(button => {
        button.disabled = !hasActiveTrack;
    });
    progressBar.disabled = !hasActiveTrack || progressBar.max === 0;
    skipPrevBtn.disabled = !hasPrevTrack;
    skipNextBtn.disabled = !hasNextTrack;
}

function updatePlayPauseLabel() {
    playPauseBtn.textContent = isPlaying ? 'Pause' : 'Play';
}

function resetProgressDisplay() {
    progressBar.value = 0;
    progressBar.max = 0;
    currentTimeLabel.textContent = '0:00';
    durationLabel.textContent = '0:00';
    isPlaying = false;
    updatePlayPauseLabel();
}

function applyStatus(status = {}) {
    const { currentTime = 0, duration = 0, isPlaying: playing = false, discId } = status;

    if (discId) {
        activeDiscId = discId;
        nowPlayingLabel.innerHTML = `Now Playing: ${discId}`;
    }

    const hasDuration = Number.isFinite(duration) && duration > 0;
    if (hasDuration) {
        progressBar.max = duration;
        durationLabel.textContent = formatTime(duration);
        if (!hasActiveTrack) {
            progressBar.disabled = true;
        }
    }

    if (!hasDuration && !hasActiveTrack) {
        progressBar.max = 0;
        durationLabel.textContent = '0:00';
        progressBar.disabled = true;
    }

    if (!isUserSeeking) {
        const safeTime = hasDuration ? Math.min(currentTime, duration) : currentTime;
        progressBar.value = Number.isFinite(safeTime) ? safeTime : 0;
        currentTimeLabel.textContent = formatTime(safeTime);
    }

    isPlaying = !!playing;
    updatePlayPauseLabel();
}

function applyState(state = {}) {
    const { currentTrack = null, queue: queued = [], history: played = [], progress } = state;

    queue = Array.isArray(queued) ? queued : [];
    history = Array.isArray(played) ? played : [];
    renderQueue();

    if (currentTrack && currentTrack.discId) {
        activeDiscId = currentTrack.discId;
        nowPlayingLabel.innerHTML = `Now Playing: ${activeDiscId}`;
        updateControlsState({
            hasTrack: true,
            hasPrev: history.length > 0,
            hasNext: queue.length > 0
        });
    } else {
        activeDiscId = null;
        nowPlayingLabel.innerHTML = 'Now Playing:';
        updateControlsState({
            hasTrack: false,
            hasPrev: history.length > 0,
            hasNext: queue.length > 0
        });
        if (!progress || !progress.isPlaying) {
            resetProgressDisplay();
        }
    }

    if (progress) {
        applyStatus(progress);
    }
}

function requestStatus() {
    chrome.runtime.sendMessage({ type: 'requestStatus' }, response => {
        if (chrome.runtime.lastError) {
            return;
        }
        if (response) {
            applyStatus(response);
        }
    });
}

function requestFullState() {
    chrome.runtime.sendMessage({ type: 'requestState' }, response => {
        if (chrome.runtime.lastError) {
            return;
        }
        if (response) {
            applyState(response);
        }
    });
}

function seekRelative(offset) {
    if (!hasActiveTrack) return;
    chrome.runtime.sendMessage({ type: 'control', command: 'seekRelative', value: offset });
}

function seekTo(time) {
    if (!hasActiveTrack) return;
    chrome.runtime.sendMessage({ type: 'control', command: 'seekTo', value: time });
}

function togglePlayback() {
    if (!hasActiveTrack) return;
    chrome.runtime.sendMessage({ type: 'control', command: 'toggle' });
}

function skipNext() {
    chrome.runtime.sendMessage({ type: 'skipNext' });
}

function skipPrevious() {
    chrome.runtime.sendMessage({ type: 'skipPrevious' });
}

function queueDisc(discId) {
    if (!discId) return;
    chrome.runtime.sendMessage({
        type: 'queueDisc',
        discId,
        path: getAudioPath(discId)
    });
}

function removeFromQueue(index) {
    chrome.runtime.sendMessage({ type: 'removeFromQueue', index });
}

function reorderQueue(fromIndex, toIndex) {
    chrome.runtime.sendMessage({ type: 'reorderQueue', fromIndex, toIndex });
}

function handleDiscSelection(discId, { queueOnly = false } = {}) {
    if (queueOnly) {
        queueDisc(discId);
        return;
    }

    chrome.runtime.sendMessage({
        type: 'playDisc',
        discId,
        path: getAudioPath(discId)
    });
}

function renderQueue() {
    queueList.innerHTML = '';

    clearQueueBtn.disabled = queue.length === 0;

    if (!queue.length) {
        const emptyItem = document.createElement('li');
        emptyItem.className = 'empty-queue';
        emptyItem.textContent = 'Queue is empty';
        queueList.appendChild(emptyItem);
        updateControlsState({
            hasTrack: hasActiveTrack,
            hasPrev: history.length > 0,
            hasNext: queue.length > 0
        });
        return;
    }

    queue.forEach((item, index) => {
        const listItem = document.createElement('li');
        listItem.className = 'queue-item';
        listItem.dataset.index = index;

        const title = document.createElement('span');
        title.className = 'queue-item-title';
        title.textContent = item.discId;

        const controls = document.createElement('div');
        controls.className = 'queue-item-controls';

        const upButton = document.createElement('button');
        upButton.className = 'queue-move-up';
        upButton.dataset.index = index;
        upButton.textContent = '⬆';
        if (index === 0) {
            upButton.disabled = true;
        }

        const downButton = document.createElement('button');
        downButton.className = 'queue-move-down';
        downButton.dataset.index = index;
        downButton.textContent = '⬇';
        if (index === queue.length - 1) {
            downButton.disabled = true;
        }

        const removeButton = document.createElement('button');
        removeButton.className = 'queue-remove';
        removeButton.dataset.index = index;
        removeButton.textContent = '✖';

        controls.appendChild(upButton);
        controls.appendChild(downButton);
        controls.appendChild(removeButton);

        listItem.appendChild(title);
        listItem.appendChild(controls);
        queueList.appendChild(listItem);
    });

    updateControlsState({
        hasTrack: hasActiveTrack,
        hasPrev: history.length > 0,
        hasNext: queue.length > 0
    });

    resizePopupToContent();
}

queueList.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
        return;
    }
    if (target.disabled) {
        return;
    }
    const index = Number.parseInt(target.dataset.index, 10);
    if (!Number.isInteger(index)) {
        return;
    }

    if (target.classList.contains('queue-remove')) {
        removeFromQueue(index);
        return;
    }

    if (target.classList.contains('queue-move-up')) {
        reorderQueue(index, index - 1);
        return;
    }

    if (target.classList.contains('queue-move-down')) {
        reorderQueue(index, index + 1);
    }
});

document.querySelectorAll('.disc').forEach(disc => {
    disc.addEventListener('click', event => {
        const discId = disc.getAttribute('data-disc-id');
        const queueOnly = event.shiftKey || event.altKey || event.metaKey;
        handleDiscSelection(discId, { queueOnly });
    });

    disc.addEventListener('contextmenu', event => {
        event.preventDefault();
        const discId = disc.getAttribute('data-disc-id');
        queueDisc(discId);
    });
});

playPauseBtn.addEventListener('click', () => {
    togglePlayback();
});

rewindBtn.addEventListener('click', () => {
    seekRelative(-10);
});

forwardBtn.addEventListener('click', () => {
    seekRelative(10);
});

skipNextBtn.addEventListener('click', () => {
    skipNext();
});

skipPrevBtn.addEventListener('click', () => {
    skipPrevious();
});

clearQueueBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'clearQueue' });
});

progressBar.addEventListener('input', event => {
    if (progressBar.disabled) return;
    isUserSeeking = true;
    currentTimeLabel.textContent = formatTime(parseFloat(event.target.value));
});

progressBar.addEventListener('change', event => {
    if (progressBar.disabled) {
        isUserSeeking = false;
        return;
    }
    const newTime = parseFloat(event.target.value);
    if (Number.isFinite(newTime)) {
        seekTo(newTime);
    }
    isUserSeeking = false;
});

chrome.runtime.onMessage.addListener(message => {
    if (message.type === 'progress') {
        applyStatus(message);
    }

    if (message.type === 'stateUpdate') {
        applyState(message.state);
        resizePopupToContent();
    }

    if (message.type === 'playbackStopped') {
        requestFullState();
        resizePopupToContent();
    }
});

chrome.storage.local.get(['currentDiscId', 'playbackState', 'uiScale'], data => {
    if (data.uiScale) {
        applyScalePreference(data.uiScale);
    }

    if (data.playbackState) {
        applyState(data.playbackState);
        if (!data.playbackState.currentTrack) {
            safeRemoveStorageKey('currentDiscId');
        }
    } else {
        renderQueue();
        updateControlsState({ hasTrack: false, hasPrev: false, hasNext: false });
        nowPlayingLabel.innerHTML = 'Now Playing:';
        safeRemoveStorageKey('currentDiscId');
    }

    requestFullState();
    requestStatus();
    resizePopupToContent();
});

window.addEventListener('load', resizePopupToContent);

window.addEventListener('keydown', event => {
    if (event.defaultPrevented) {
        return;
    }

    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable) {
        return;
    }

    switch (event.code) {
        case 'Space':
            event.preventDefault();
            togglePlayback();
            break;
        case 'ArrowLeft':
            event.preventDefault();
            seekRelative(-10);
            break;
        case 'ArrowRight':
            event.preventDefault();
            seekRelative(10);
            break;
        default:
            break;
    }
});
