let currentlyPlayingAudio = null;
let currentDiscId = null;

function safeSendMessage(payload) {
    const maybePromise = chrome.runtime.sendMessage(payload);
    if (maybePromise && typeof maybePromise.catch === 'function') {
        maybePromise.catch(() => {});
    }
}

function attachAudioHandlers(audio) {
    audio.addEventListener('timeupdate', sendProgressUpdate);
    audio.addEventListener('play', sendProgressUpdate);
    audio.addEventListener('pause', sendProgressUpdate);
    audio.addEventListener('loadedmetadata', sendProgressUpdate);
    audio.addEventListener('ended', handleEnded);
}

function detachAudioHandlers(audio) {
    audio.removeEventListener('timeupdate', sendProgressUpdate);
    audio.removeEventListener('play', sendProgressUpdate);
    audio.removeEventListener('pause', sendProgressUpdate);
    audio.removeEventListener('loadedmetadata', sendProgressUpdate);
    audio.removeEventListener('ended', handleEnded);
}

function getDuration(audio) {
    if (!audio) return 0;
    const { duration } = audio;
    return Number.isFinite(duration) && duration > 0 ? duration : 0;
}

function clampToDuration(time, audio) {
    if (!audio) return 0;
    const duration = getDuration(audio);
    const lowerBounded = Math.max(time, 0);
    if (duration === 0) {
        return lowerBounded;
    }
    return Math.min(lowerBounded, duration);
}

function sendProgressUpdate() {
    const audio = currentlyPlayingAudio;
    const payload = {
        type: 'progress',
        currentTime: audio ? audio.currentTime : 0,
        duration: getDuration(audio),
        isPlaying: Boolean(audio && !audio.paused),
        discId: currentDiscId || undefined
    };

    safeSendMessage(payload);
}

function notifyTrackStopped(reason = 'stopped') {
    safeSendMessage({ type: 'playbackStopped', reason, discId: currentDiscId || undefined });
    currentDiscId = null;
}

function playAudio({ source, volume = 1, discId }) {
    if (currentlyPlayingAudio) {
        detachAudioHandlers(currentlyPlayingAudio);
        currentlyPlayingAudio.pause();
    }

    const audio = new Audio(source);
    audio.volume = volume;
    audio.currentTime = 0;

    attachAudioHandlers(audio);
    currentlyPlayingAudio = audio;
    currentDiscId = discId || currentDiscId;

    sendProgressUpdate();

    audio.play().then(sendProgressUpdate).catch(() => {
        notifyTrackStopped('error');
        detachAudioHandlers(audio);
        if (currentlyPlayingAudio === audio) {
            currentlyPlayingAudio = null;
        }
    });
}

function pauseAudio() {
    if (!currentlyPlayingAudio) return;
    currentlyPlayingAudio.pause();
    sendProgressUpdate();
}

function resumeAudio() {
    if (!currentlyPlayingAudio) return;
    const audio = currentlyPlayingAudio;
    audio.play().then(sendProgressUpdate).catch(() => {
        notifyTrackStopped('error');
        detachAudioHandlers(audio);
        if (currentlyPlayingAudio === audio) {
            currentlyPlayingAudio = null;
        }
    });
}

function togglePlayback() {
    if (!currentlyPlayingAudio) return;
    if (currentlyPlayingAudio.paused) {
        resumeAudio();
    } else {
        pauseAudio();
    }
}

function stopAudio() {
    if (!currentlyPlayingAudio) return;
    const audio = currentlyPlayingAudio;
    audio.pause();
    audio.currentTime = 0;
    sendProgressUpdate();
    detachAudioHandlers(audio);
    currentlyPlayingAudio = null;
    notifyTrackStopped('stopped');
}

function seekRelative(offset) {
    if (!currentlyPlayingAudio) return;
    const audio = currentlyPlayingAudio;
    audio.currentTime = clampToDuration(audio.currentTime + offset, audio);
    sendProgressUpdate();
}

function seekTo(time) {
    if (!currentlyPlayingAudio) return;
    if (!Number.isFinite(time)) return;
    const audio = currentlyPlayingAudio;
    audio.currentTime = clampToDuration(time, audio);
    sendProgressUpdate();
}

function handleEnded() {
    sendProgressUpdate();
    if (currentlyPlayingAudio) {
        detachAudioHandlers(currentlyPlayingAudio);
        currentlyPlayingAudio = null;
    }
    notifyTrackStopped('ended');
}

function getStatus() {
    const audio = currentlyPlayingAudio;
    return {
        currentTime: audio ? audio.currentTime : 0,
        duration: getDuration(audio),
        isPlaying: Boolean(audio && !audio.paused),
        discId: currentDiscId || undefined
    };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.play) {
        playAudio(msg.play);
        return;
    }

    if (msg.pause) {
        pauseAudio();
        return;
    }

    if (msg.resume) {
        resumeAudio();
        return;
    }

    if (msg.toggle) {
        togglePlayback();
        return;
    }

    if (msg.stop) {
        stopAudio();
        return;
    }

    if (typeof msg.seekRelative === 'number') {
        seekRelative(msg.seekRelative);
        return;
    }

    if (typeof msg.seekTo === 'number') {
        seekTo(msg.seekTo);
        return;
    }

    if (msg.type === 'requestStatus') {
        sendResponse(getStatus());
    }
});
