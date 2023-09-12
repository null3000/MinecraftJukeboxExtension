let lastClickedDiscId = null;
document.querySelectorAll('.disc').forEach(disc => {
    disc.addEventListener('click', function() {
        const discId = this.getAttribute('data-disc-id');
        const audioPath = `./assets/audio/${discId}.mp3`;
            if (lastClickedDiscId) {
                chrome.runtime.sendMessage({
                    command: "pause"
                });
            }

        if(discId === 'stop') {
            document.getElementById('now-playing').innerHTML = `Now Playing:`;
        } else{
            document.getElementById('now-playing').innerHTML = `Now Playing: ${discId}`;
        }


        
        chrome.runtime.sendMessage({
            command: "playAudio",
            path: audioPath
        });
        
        lastClickedDiscId = discId;
    });
});

