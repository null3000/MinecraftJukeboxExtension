let currentlyPlayingAudio = null;

chrome.runtime.onMessage.addListener(msg => {
    if ('play' in msg) {
        playAudio(msg.play);
    }
    if ('pause' in msg) {
        pauseAudio();
    }
});

function playAudio({ source, volume }) {
    if (currentlyPlayingAudio) {
        currentlyPlayingAudio.pause();
    }

    const audio = new Audio(source);
    audio.volume = volume;
    audio.play();

    currentlyPlayingAudio = audio;
}

function pauseAudio() {
    if (currentlyPlayingAudio) {
        currentlyPlayingAudio.pause();
    }
}
