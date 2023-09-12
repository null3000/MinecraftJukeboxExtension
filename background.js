async function playSound(source = 'default.wav', volume = 1) {
    await createOffscreen();
    await chrome.runtime.sendMessage({ play: { source, volume } });
}

async function createOffscreen() {
    if (await chrome.offscreen.hasDocument()) return;
    await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Used to contuine playing music after popup is closed.'
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.command === "playAudio") {
        playSound(message.path, 1); 
    }
});
