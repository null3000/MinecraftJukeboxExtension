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
const volumeSlider = document.getElementById('volume-slider');
const volumeIcon = document.querySelector('.volume-icon');
const selectAssetsBtn = document.getElementById('select-assets-btn');
const assetsStatusLabel = document.getElementById('assets-status');
const assetsStatusRow = document.querySelector('.assets-status-row');
const assetsDirectoryInput = document.getElementById('assets-directory-input');
const discElements = Array.from(document.querySelectorAll('.disc'));
const discMenuToggle = document.getElementById('disc-menu-toggle');
const discMenuPanel = document.getElementById('disc-menu-panel');

let assetsStatusClearTimer = null;
let isDiscLibraryReady = false;

const ASSET_RECORD_PATTERN = /^minecraft\/sounds\/records\/([^/]+)\.ogg$/;
const STATUS_VARIANTS = ['error', 'success', 'warning'];
const READY_ASSETS_STATUS = '';

function detectPlatform() {
    const uaDataPlatform = navigator.userAgentData?.platform;
    const platform = (uaDataPlatform || navigator.platform || '').toLowerCase();
    if (platform.includes('mac')) return 'mac';
    if (platform.includes('win')) return 'windows';
    if (platform.includes('linux')) return 'linux';
    return 'other';
}

const PLATFORM_KEY = detectPlatform();

const DISC_ID_ALIASES = new Map([
    ['13', '13'],
    ['11', '11'],
    ['5', '5'],
    ['cat', 'cat'],
    ['blocks', 'blocks'],
    ['chirp', 'chirp'],
    ['far', 'far'],
    ['mall', 'mall'],
    ['mellohi', 'mellohi'],
    ['stal', 'stal'],
    ['strad', 'strad'],
    ['ward', 'ward'],
    ['wait', 'wait'],
    ['otherside', 'otherside'],
    ['pigstep', 'pigstep'],
    ['Pigstep', 'pigstep'],
    ['music_disc.pigstep', 'pigstep'],
    ['relic', 'relic'],
    ['Relic', 'relic'],
    ['music_disc.relic', 'relic'],
    ['creator', 'creator'],
    ['Creator', 'creator'],
    ['music_disc.creator', 'creator'],
    ['Creator(MB)', 'creator_music_box'],
    ['Creator (MB)', 'creator_music_box'],
    ['Creator Music Box', 'creator_music_box'],
    ['Creator music box', 'creator_music_box'],
    ['music_disc.creator_music_box', 'creator_music_box'],
    ['precipice', 'precipice'],
    ['Precipice', 'precipice'],
    ['music_disc.precipice', 'precipice'],
    ['tears', 'tears'],
    ['Tears', 'tears'],
    ['music_disc.tears', 'tears'],
    ['lava chicken', 'lava_chicken'],
    ['Lava Chicken', 'lava_chicken'],
    ['lava_chicken', 'lava_chicken'],
    ['The Jukebox', 'the_jukebox'],
    ['the jukebox', 'the_jukebox'],
    ['the_jukebox', 'the_jukebox'],
    ['Default 1hr', 'the_jukebox'],
    ['default 1hr', 'the_jukebox'],
    ['default_1hr', 'the_jukebox'],
    ['music_disc.13', '13'],
    ['music_disc.11', '11'],
    ['music_disc.5', '5'],
    ['music_disc.cat', 'cat'],
    ['music_disc.blocks', 'blocks'],
    ['music_disc.chirp', 'chirp'],
    ['music_disc.far', 'far'],
    ['music_disc.mall', 'mall'],
    ['music_disc.mellohi', 'mellohi'],
    ['music_disc.stal', 'stal'],
    ['music_disc.strad', 'strad'],
    ['music_disc.ward', 'ward'],
    ['music_disc.wait', 'wait'],
    ['music_disc.otherside', 'otherside']
]);

const STREAMING_SOURCE_MAP = new Map([
    ['11', [
        'https://minecraft.wiki/images/11.ogg?348cd'
    ]],
    ['cat', [
        'https://dn721500.ca.archive.org/0/items/C418-MinecraftSoundtrackVolumeAlpha/19%20-%20Cat.mp3'
    ]],
    ['blocks', [
        'https://dn721809.ca.archive.org/0/items/minecraft-volume-beta/Minecraft%20Volume%20Beta/28.%20Blocks.mp3'
    ]],
    ['chirp', [
        'https://dn721809.ca.archive.org/0/items/minecraft-volume-beta/Minecraft%20Volume%20Beta/20.%20Chirp.mp3'
    ]],
    ['far', [
        'https://dn721809.ca.archive.org/0/items/minecraft-volume-beta/Minecraft%20Volume%20Beta/29.%20Far.mp3'
    ]],
    ['mall', [
        'https://dn721809.ca.archive.org/0/items/minecraft-volume-beta/Minecraft%20Volume%20Beta/27.%20Mall.mp3'
    ]],
    ['mellohi', [
        'https://dn721809.ca.archive.org/0/items/minecraft-volume-beta/Minecraft%20Volume%20Beta/22.%20Mellohi.mp3'
    ]],
    ['stal', [
        'https://dn721809.ca.archive.org/0/items/minecraft-volume-beta/Minecraft%20Volume%20Beta/23%20Stal.mp3'
    ]],
    ['strad', [
        'https://ia902309.us.archive.org/6/items/minecraft-volume-beta/Minecraft%20Volume%20Beta/24.%20Strad.mp3'
    ]],
    ['ward', [
        'https://dn721809.ca.archive.org/0/items/minecraft-volume-beta/Minecraft%20Volume%20Beta/26.%20Ward.mp3'
    ]],
    ['wait', [
        'https://ia802309.us.archive.org/6/items/minecraft-volume-beta/Minecraft%20Volume%20Beta/21.%20Wait.mp3'
    ]],
    ['pigstep', [
        'https://dn721806.ca.archive.org/0/items/minecraft-nether-update-original-game-soundtrack-flac/04.%20Lena%20Raine%20-%20Pigstep%20%28Mono%20Mix%29.mp3'
    ]]
]);

const JUKEBOX_DISC_ID = 'the_jukebox';
const JUKEBOX_AUTOPLAY_COUNT = 10;
const JUKEBOX_TRACKS = Object.freeze([
    { title: 'Key', url: 'https://archive.org/download/C418-MinecraftSoundtrackVolumeAlpha/01%20-%20Key.mp3' },
    { title: 'Door', url: 'https://archive.org/download/C418-MinecraftSoundtrackVolumeAlpha/02%20-%20Door.mp3' },
    { title: 'Subwoofer Lullaby', url: 'https://archive.org/download/C418-MinecraftSoundtrackVolumeAlpha/03%20-%20Subwoofer%20Lullaby.mp3' },
    { title: 'Living Mice', url: 'https://archive.org/download/C418-MinecraftSoundtrackVolumeAlpha/05%20-%20Living%20Mice.mp3' },
    { title: 'Moog City', url: 'https://archive.org/download/C418-MinecraftSoundtrackVolumeAlpha/06%20-%20Moog%20City.mp3' },
    { title: 'Haggstrom', url: 'https://archive.org/download/C418-MinecraftSoundtrackVolumeAlpha/07%20-%20Haggstrom.mp3' },
    { title: 'Minecraft', url: 'https://archive.org/download/C418-MinecraftSoundtrackVolumeAlpha/08%20-%20Minecraft.mp3' },
    { title: 'Oxygene', url: 'https://archive.org/download/C418-MinecraftSoundtrackVolumeAlpha/09%20-%20Oxyg%C3%A8ne.mp3' },
    { title: 'Equinoxe', url: 'https://archive.org/download/C418-MinecraftSoundtrackVolumeAlpha/10%20-%20%C3%89quinoxe.mp3' },
    { title: 'Mice on Venus', url: 'https://archive.org/download/C418-MinecraftSoundtrackVolumeAlpha/11%20-%20Mice%20on%20Venus.mp3' },
    { title: 'Dry Hands', url: 'https://archive.org/download/C418-MinecraftSoundtrackVolumeAlpha/12%20-%20Dry%20Hands.mp3' },
    { title: 'Wet Hands', url: 'https://archive.org/download/C418-MinecraftSoundtrackVolumeAlpha/13%20-%20Wet%20Hands.mp3' },
    { title: 'Clark', url: 'https://archive.org/download/C418-MinecraftSoundtrackVolumeAlpha/14%20-%20Clark.mp3' },
    { title: 'Chris', url: 'https://archive.org/download/C418-MinecraftSoundtrackVolumeAlpha/15%20-%20Chris.mp3' },
    { title: 'Thirteen', url: 'https://archive.org/download/C418-MinecraftSoundtrackVolumeAlpha/16%20-%20Thirteen.mp3' },
    { title: 'Excuse', url: 'https://archive.org/download/C418-MinecraftSoundtrackVolumeAlpha/17%20-%20Excuse.mp3' },
    { title: 'Sweden', url: 'https://archive.org/download/C418-MinecraftSoundtrackVolumeAlpha/18%20-%20Sweden.mp3' },
    { title: 'Cat', url: 'https://archive.org/download/C418-MinecraftSoundtrackVolumeAlpha/19%20-%20Cat.mp3' },
    { title: 'Dog', url: 'https://archive.org/download/C418-MinecraftSoundtrackVolumeAlpha/20%20-%20Dog.mp3' },
    { title: 'Danny', url: 'https://archive.org/download/C418-MinecraftSoundtrackVolumeAlpha/21%20-%20Danny.mp3' },
    { title: 'Beginning', url: 'https://archive.org/download/C418-MinecraftSoundtrackVolumeAlpha/22%20-%20Beginning.mp3' },
    { title: 'Droopy Likes Ricochet', url: 'https://archive.org/download/C418-MinecraftSoundtrackVolumeAlpha/23%20-%20Droopy%20Likes%20Ricochet.mp3' },
    { title: 'Droopy Likes Your Face', url: 'https://archive.org/download/C418-MinecraftSoundtrackVolumeAlpha/24%20-%20Droopy%20Likes%20Your%20Face.mp3' },
    { title: 'Ki', url: 'https://archive.org/download/Minecraftostvolumebeta/C418-Minecraft%20Soundtrack%20Volume%20Beta/01.%20Ki.mp3' },
    { title: 'Alpha', url: 'https://archive.org/download/Minecraftostvolumebeta/C418-Minecraft%20Soundtrack%20Volume%20Beta/02.%20Alpha.mp3' },
    { title: 'Dead Voxel', url: 'https://archive.org/download/Minecraftostvolumebeta/C418-Minecraft%20Soundtrack%20Volume%20Beta/03.%20Dead%20Voxel.mp3' },
    { title: 'Blind Spots', url: 'https://archive.org/download/Minecraftostvolumebeta/C418-Minecraft%20Soundtrack%20Volume%20Beta/04.%20Blind%20Spots.mp3' },
    { title: 'Flake', url: 'https://archive.org/download/Minecraftostvolumebeta/C418-Minecraft%20Soundtrack%20Volume%20Beta/05.%20Flake.mp3' },
    { title: 'Moog City 2', url: 'https://archive.org/download/Minecraftostvolumebeta/C418-Minecraft%20Soundtrack%20Volume%20Beta/06.%20Moog%20City%202.mp3' },
    { title: 'Concrete Halls', url: 'https://archive.org/download/Minecraftostvolumebeta/C418-Minecraft%20Soundtrack%20Volume%20Beta/07.%20Concrete%20Halls.mp3' },
    { title: 'Biome Fest', url: 'https://archive.org/download/Minecraftostvolumebeta/C418-Minecraft%20Soundtrack%20Volume%20Beta/08.%20Biome%20Fest.mp3' },
    { title: 'Mutation', url: 'https://archive.org/download/Minecraftostvolumebeta/C418-Minecraft%20Soundtrack%20Volume%20Beta/09.%20Mutation.mp3' },
    { title: 'Haunt Muskie', url: 'https://archive.org/download/Minecraftostvolumebeta/C418-Minecraft%20Soundtrack%20Volume%20Beta/10.%20Haunt%20Muskie.mp3' },
    { title: 'Warmth', url: 'https://archive.org/download/Minecraftostvolumebeta/C418-Minecraft%20Soundtrack%20Volume%20Beta/11.%20Warmth.mp3' },
    { title: 'Floating Trees', url: 'https://archive.org/download/Minecraftostvolumebeta/C418-Minecraft%20Soundtrack%20Volume%20Beta/12.%20Floating%20Trees.mp3' },
    { title: 'Aria Math', url: 'https://archive.org/download/Minecraftostvolumebeta/C418-Minecraft%20Soundtrack%20Volume%20Beta/13.%20Aria%20Math.mp3' },
    { title: 'Kyoto', url: 'https://archive.org/download/Minecraftostvolumebeta/C418-Minecraft%20Soundtrack%20Volume%20Beta/14.%20Kyoto.mp3' },
    { title: 'Ballad of the Cats', url: 'https://archive.org/download/Minecraftostvolumebeta/C418-Minecraft%20Soundtrack%20Volume%20Beta/15.%20Ballad%20of%20the%20Cats.mp3' },
    { title: 'Taswell', url: 'https://archive.org/download/Minecraftostvolumebeta/C418-Minecraft%20Soundtrack%20Volume%20Beta/16.%20Taswell.mp3' },
    { title: 'Beginning 2', url: 'https://archive.org/download/Minecraftostvolumebeta/C418-Minecraft%20Soundtrack%20Volume%20Beta/17.%20Beginning%202.mp3' },
    { title: 'Dreiton', url: 'https://archive.org/download/Minecraftostvolumebeta/C418-Minecraft%20Soundtrack%20Volume%20Beta/18.%20Dreiton.mp3' },
    { title: 'The End', url: 'https://archive.org/download/Minecraftostvolumebeta/C418-Minecraft%20Soundtrack%20Volume%20Beta/19.%20The%20End.mp3' },
    { title: 'Chirp', url: 'https://archive.org/download/Minecraftostvolumebeta/C418-Minecraft%20Soundtrack%20Volume%20Beta/20.%20Chirp.mp3' },
    { title: 'Wait', url: 'https://archive.org/download/Minecraftostvolumebeta/C418-Minecraft%20Soundtrack%20Volume%20Beta/21.%20Wait.mp3' },
    { title: 'Mellohi', url: 'https://archive.org/download/Minecraftostvolumebeta/C418-Minecraft%20Soundtrack%20Volume%20Beta/22.%20Mellohi.mp3' },
    { title: 'Stal', url: 'https://archive.org/download/Minecraftostvolumebeta/C418-Minecraft%20Soundtrack%20Volume%20Beta/23%20Stal.mp3' },
    { title: 'Strad', url: 'https://archive.org/download/Minecraftostvolumebeta/C418-Minecraft%20Soundtrack%20Volume%20Beta/24.%20Strad.mp3' },
    { title: 'Eleven', url: 'https://archive.org/download/Minecraftostvolumebeta/C418-Minecraft%20Soundtrack%20Volume%20Beta/25.%20Eleven.mp3' },
    { title: 'Ward', url: 'https://archive.org/download/Minecraftostvolumebeta/C418-Minecraft%20Soundtrack%20Volume%20Beta/26.%20Ward.mp3' },
    { title: 'Mall', url: 'https://archive.org/download/Minecraftostvolumebeta/C418-Minecraft%20Soundtrack%20Volume%20Beta/27.%20Mall.mp3' },
    { title: 'Blocks', url: 'https://archive.org/download/Minecraftostvolumebeta/C418-Minecraft%20Soundtrack%20Volume%20Beta/28.%20Blocks.mp3' },
    { title: 'Far', url: 'https://archive.org/download/Minecraftostvolumebeta/C418-Minecraft%20Soundtrack%20Volume%20Beta/29.%20Far.mp3' },
    { title: 'Intro', url: 'https://archive.org/download/Minecraftostvolumebeta/C418-Minecraft%20Soundtrack%20Volume%20Beta/30.%20Intro.mp3' },
    { title: 'Chrysopoeia', url: 'https://archive.org/download/minecraft-nether-update-original-game-soundtrack-flac/01.%20Lena%20Raine%20-%20Chrysopoeia.mp3' },
    { title: 'Rubedo', url: 'https://archive.org/download/minecraft-nether-update-original-game-soundtrack-flac/02.%20Lena%20Raine%20-%20Rubedo.mp3' },
    { title: 'So Below', url: 'https://archive.org/download/minecraft-nether-update-original-game-soundtrack-flac/03.%20Lena%20Raine%20-%20So%20Below.mp3' },
    { title: 'Pigstep', url: 'https://archive.org/download/minecraft-nether-update-original-game-soundtrack-flac/04.%20Lena%20Raine%20-%20Pigstep%20%28Mono%20Mix%29.mp3' }
]);

let streamingHostsWarmed = false;

function normalizeStreamingUrl(url) {
    if (typeof url !== 'string') {
        return null;
    }
    const trimmed = url.trim();
    if (!trimmed) {
        return null;
    }
    return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

function isStreamingEnabled() {
    return true;
}

function warmStreamingHosts() {
    if (streamingHostsWarmed || typeof document === 'undefined') {
        return;
    }

    const head = document.head || document.getElementsByTagName('head')[0];
    if (!head) {
        return;
    }

    const origins = new Set();
    for (const urls of STREAMING_SOURCE_MAP.values()) {
        if (!Array.isArray(urls)) {
            continue;
        }
        for (const candidate of urls) {
            const normalized = normalizeStreamingUrl(candidate);
            if (!normalized) {
                continue;
            }
            try {
                origins.add(new URL(normalized).origin);
            } catch (error) {
                /* ignore invalid streaming URLs */
            }
        }
    }

    for (const track of JUKEBOX_TRACKS) {
        if (!track || typeof track.url !== 'string') {
            continue;
        }
        const normalized = normalizeStreamingUrl(track.url);
        if (!normalized) {
            continue;
        }
        try {
            origins.add(new URL(normalized).origin);
        } catch (error) {
            /* ignore invalid streaming URLs */
        }
    }

    origins.forEach(origin => {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = origin;
        link.crossOrigin = 'anonymous';
        head.appendChild(link);
    });

    streamingHostsWarmed = true;
}

if (typeof document !== 'undefined') {
    warmStreamingHosts();
}

function slugifyForJukebox(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function secureRandomIntExclusive(max) {
    if (!Number.isInteger(max) || max <= 0) {
        return 0;
    }
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const uint32 = new Uint32Array(1);
        const upperBound = 0x100000000;
        const acceptableTop = upperBound - (upperBound % max);
        do {
            crypto.getRandomValues(uint32);
        } while (uint32[0] >= acceptableTop);
        return uint32[0] % max;
    }
    return Math.floor(Math.random() * max);
}

function shuffleArrayInPlace(array) {
    for (let index = array.length - 1; index > 0; index -= 1) {
        const swapIndex = secureRandomIntExclusive(index + 1);
        if (swapIndex !== index) {
            const temp = array[index];
            array[index] = array[swapIndex];
            array[swapIndex] = temp;
        }
    }
    return array;
}

function isJukeboxDisc(discId) {
    return toAssetKey(discId) === JUKEBOX_DISC_ID;
}

function getRandomizedJukeboxTracks(limit) {
    if (!Number.isInteger(limit) || limit <= 0) {
        return [];
    }
    const candidates = JUKEBOX_TRACKS.filter(track => {
        return track
            && typeof track.title === 'string'
            && track.title.trim()
            && typeof track.url === 'string'
            && normalizeStreamingUrl(track.url);
    }).map(track => ({
        title: track.title.trim(),
        url: normalizeStreamingUrl(track.url)
    }));
    if (!candidates.length) {
        return [];
    }
    const pool = shuffleArrayInPlace(candidates.slice());
    return pool.slice(0, Math.min(limit, pool.length));
}

function canDiscStreamWithoutLibrary(discId) {
    if (!discId) {
        return false;
    }
    if (isJukeboxDisc(discId)) {
        return true;
    }
    return hasStreamingSource(discId);
}

function buildJukeboxTrackPayload(track, index) {
    if (!track || typeof track.title !== 'string' || typeof track.url !== 'string') {
        return null;
    }
    const normalizedUrl = normalizeStreamingUrl(track.url);
    if (!normalizedUrl) {
        return null;
    }
    const trimmedTitle = track.title.trim();
    if (!trimmedTitle) {
        return null;
    }
    const order = index + 1;
    const paddedOrder = String(order).padStart(2, '0');
    const slug = slugifyForJukebox(trimmedTitle) || `track-${paddedOrder}`;
    return {
        discId: trimmedTitle,
        assetKey: `${JUKEBOX_DISC_ID}_${paddedOrder}_${slug}`,
        objectUrl: normalizedUrl,
        isStream: true
    };
}

function handleJukeboxSelection({ queueOnly = false } = {}) {
    const limit = Math.min(Math.max(JUKEBOX_AUTOPLAY_COUNT, 0), JUKEBOX_TRACKS.length);
    if (!limit) {
        setAssetsStatus('No tracks available for The Jukebox.', 'error');
        return true;
    }

    const randomizedTracks = getRandomizedJukeboxTracks(limit);
    if (!randomizedTracks.length) {
        setAssetsStatus('No tracks available for The Jukebox.', 'error');
        return true;
    }

    const payloads = [];
    randomizedTracks.forEach((track, index) => {
        const payload = buildJukeboxTrackPayload(track, index);
        if (payload) {
            payloads.push(payload);
        }
    });
    if (!payloads.length) {
        setAssetsStatus('No tracks available for The Jukebox.', 'error');
        return true;
    }

    payloads.forEach((payload, index) => {
        const type = queueOnly || index > 0 ? 'queueDisc' : 'playDisc';
        chrome.runtime.sendMessage({ type, ...payload });
    });

    if (queueOnly) {
        setAssetsStatus(`Queued ${payloads.length} tracks from The Jukebox.`, 'success', { autoClear: true, clearDelay: 4000 });
    } else {
        setAssetsStatus(DEFAULT_ASSETS_STATUS);
    }
    return true;
}

function updateDiscAvailabilityIndicators() {
    if (!discElements.length) {
        return;
    }
    discElements.forEach(disc => {
        const discId = disc.getAttribute('data-disc-id');
        const shouldDisable = !isDiscLibraryReady && !canDiscStreamWithoutLibrary(discId);
        disc.classList.toggle('disabled', shouldDisable);
        if (shouldDisable) {
            disc.setAttribute('aria-disabled', 'true');
        } else {
            disc.removeAttribute('aria-disabled');
        }
    });
}

function openDiscHelpPage() {
    const helpUrl = chrome.runtime ? chrome.runtime.getURL('disc-help.html') : 'disc-help.html';
    window.open(helpUrl, '_blank', 'noopener,noreferrer');
}

function updateSelectAssetsButtonVisibility() {
    if (!selectAssetsBtn) {
        return;
    }
    const hasReadyLocalAudio = isDiscLibraryReady && discHashIndex.size > 0;
    if (hasReadyLocalAudio) {
        selectAssetsBtn.setAttribute('hidden', '');
    } else {
        selectAssetsBtn.removeAttribute('hidden');
    }
    resizePopupToContent();
}

function setDiscMenuVisibility(expanded, { persist = true } = {}) {
    if (!discMenuToggle || !discMenuPanel) {
        return;
    }
    if (expanded) {
        discMenuPanel.removeAttribute('hidden');
        discMenuPanel.classList.add('expanded');
    } else {
        discMenuPanel.setAttribute('hidden', '');
        discMenuPanel.classList.remove('expanded');
    }
    discMenuToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    if (expanded) {
        discMenuPanel.scrollTop = 0;
    }
    if (persist && chrome?.storage?.local?.set) {
        try {
            const maybePromise = chrome.storage.local.set({ discMenuExpanded: Boolean(expanded) });
            if (maybePromise && typeof maybePromise.catch === 'function') {
                maybePromise.catch(() => {});
            }
        } catch (error) {
            /* ignore persistence issues */
        }
    }

    resizePopupToContent();
}

function getAssetsFolderHint() {
    switch (PLATFORM_KEY) {
        case 'windows':
            return '%AppData%\\.minecraft\\assets';
        case 'mac':
            return '~/Library/Application Support/minecraft/assets';
        case 'linux':
            return '~/.minecraft/assets';
        default:
            return '.minecraft/assets';
    }
}

function getObjectsFolderHint() {
    switch (PLATFORM_KEY) {
        case 'windows':
            return '%AppData%\\.minecraft\\assets\\objects';
        case 'mac':
            return '~/Library/Application Support/minecraft/assets/objects';
        case 'linux':
            return '~/.minecraft/assets/objects';
        default:
            return '.minecraft/assets/objects';
    }
}

function getIndexesFolderHint() {
    switch (PLATFORM_KEY) {
        case 'windows':
            return '%AppData%\\.minecraft\\assets\\indexes';
        case 'mac':
            return '~/Library/Application Support/minecraft/assets/indexes';
        case 'linux':
            return '~/.minecraft/assets/indexes';
        default:
            return '.minecraft/assets/indexes';
    }
}

function getHiddenFolderTip() {
    switch (PLATFORM_KEY) {
        case 'windows':
            return 'Enable "Show hidden items" in File Explorer if the folder is hidden.';
        case 'mac':
            return 'Press Command+Shift+. to reveal hidden folders such as Library.';
        case 'linux':
            return 'Enable viewing hidden files (Ctrl+H) if needed.';
        default:
            return null;
    }
}

function withHint(baseMessage, hint) {
    if (!hint) {
        return baseMessage;
    }
    const trimmed = baseMessage.trimEnd();
    const endsWithPeriod = trimmed.endsWith('.');
    if (endsWithPeriod) {
        return `${trimmed.slice(0, -1)} (${hint}).`;
    }
    return `${baseMessage} (${hint})`;
}

function getPlatformDisplayName() {
    switch (PLATFORM_KEY) {
        case 'windows':
            return 'Windows';
        case 'mac':
            return 'macOS';
        case 'linux':
            return 'Linux';
        default:
            return 'Your system';
    }
}

function normalizeRelativePath(path) {
    if (!path) {
        return '';
    }
    const cleaned = String(path).replace(/^[.\\/]+/, '').replace(/\\/g, '/');
    const segments = cleaned.split('/').filter(segment => segment.length > 0);
    if (!segments.length) {
        return '';
    }

    const lowerSegments = segments.map(segment => segment.toLowerCase());
    const targetIndex = lowerSegments.findIndex(segment => segment === 'indexes' || segment === 'objects');
    if (targetIndex > 0) {
        return segments.slice(targetIndex).join('/');
    }
    return segments.join('/');
}

function waitForDirectoryUploadSelection(input) {
    return new Promise((resolve, reject) => {
        if (!input) {
            reject(new Error('Folder uploads are not supported in this browser.'));
            return;
        }

        const handleChange = () => {
            input.removeEventListener('change', handleChange);
            input.removeEventListener('cancel', handleCancel);
            const files = input.files ? Array.from(input.files) : [];
            input.value = '';
            resolve(files);
        };

        const handleCancel = () => {
            input.removeEventListener('cancel', handleCancel);
            input.removeEventListener('change', handleChange);
            input.value = '';
            reject(new DOMException('Selection cancelled.', 'AbortError'));
        };

        input.addEventListener('change', handleChange, { once: true });
        input.addEventListener('cancel', handleCancel, { once: true });
        try {
            input.click();
        } catch (error) {
            input.removeEventListener('change', handleChange);
            input.removeEventListener('cancel', handleCancel);
            reject(error);
        }
    });
}

function pickLatestIndexFile(files = []) {
    let latest = null;
    for (const file of files) {
        if (!(file instanceof File)) {
            continue;
        }
        const path = normalizeRelativePath(file.webkitRelativePath || file.name);
        if (!path.startsWith('indexes/') || !path.endsWith('.json')) {
            continue;
        }
        if (!latest || file.lastModified > latest.file.lastModified || (file.lastModified === latest.file.lastModified && path > latest.path)) {
            latest = { file, path };
        }
    }
    return latest;
}

function collectObjectFiles(files = []) {
    const objectFiles = new Map();
    for (const file of files) {
        if (!(file instanceof File)) {
            continue;
        }
        const path = normalizeRelativePath(file.webkitRelativePath || file.name);
        if (!path.startsWith('objects/')) {
            continue;
        }
        objectFiles.set(path, file);
    }
    return objectFiles;
}

function buildDefaultAssetsStatus() {
    return '';
}

const DEFAULT_ASSETS_STATUS = buildDefaultAssetsStatus();

let minecraftAssetsHandles = null;
let discHashIndex = new Map();
let discObjectUrlRegistry = new Map();
let isLoadingAssets = false;
const SCALE_OPTIONS = ['small', 'medium', 'large'];
const SCALE_CLASSES = SCALE_OPTIONS.map(option => `scale-${option}`);
const DEFAULT_SCALE = 'small';
const MAX_VOLUME = 3;
const PING_ENDPOINT = 'https://lupyhlznsiokxpeqftpg.supabase.co/functions/v1/ping';

let activeDiscId = null;
let isPlaying = false;
let hasActiveTrack = false;
let hasPrevTrack = false;
let hasNextTrack = false;
let isUserSeeking = false;
let queue = [];
let history = [];
let resizeFrameId = null;
let currentVolume = 1;
let lastNonZeroVolume = 1;
const pendingDiscActions = [];

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

function setAssetsStatus(message = DEFAULT_ASSETS_STATUS, variant = null, { autoClear = false, clearDelay = 4000 } = {}) {
    if (!assetsStatusLabel) {
        return;
    }

    const nextMessage = message == null ? '' : String(message);
    const trimmedMessage = nextMessage.trim();

    assetsStatusLabel.textContent = trimmedMessage;
    assetsStatusLabel.classList.remove(...STATUS_VARIANTS);

    if (assetsStatusRow) {
        if (trimmedMessage.length === 0) {
            assetsStatusRow.classList.add('hidden');
        } else {
            assetsStatusRow.classList.remove('hidden');
        }
    }

    if (variant && STATUS_VARIANTS.includes(variant)) {
        assetsStatusLabel.classList.add(variant);
    }

    if (assetsStatusClearTimer) {
        clearTimeout(assetsStatusClearTimer);
        assetsStatusClearTimer = null;
    }

    if (autoClear) {
        assetsStatusClearTimer = setTimeout(() => {
            assetsStatusClearTimer = null;
            if (isDiscLibraryReady) {
                setAssetsStatus(READY_ASSETS_STATUS);
            } else {
                setAssetsStatus(DEFAULT_ASSETS_STATUS);
            }
        }, Math.max(1000, clearDelay));
    }
}

function showDiscLibraryNotReadyStatus() {}

function enqueueDiscAction(action) {
    if (!action || !action.discId) {
        return;
    }

    const { discId, type } = action;
    const existingIndex = pendingDiscActions.findIndex(item => item.discId === discId && item.type === type);
    if (existingIndex !== -1) {
        pendingDiscActions.splice(existingIndex, 1);
    }

    pendingDiscActions.push(action);
}

function flushPendingDiscActions() {
    if (!isDiscLibraryReady || pendingDiscActions.length === 0) {
        return;
    }

    const actions = pendingDiscActions.splice(0, pendingDiscActions.length);
    for (const action of actions) {
        const { discId, type, queueOnly = false } = action;
        if (!discId) {
            continue;
        }

        if (type === 'queue') {
            queueDisc(discId, { allowRetry: false });
        } else if (type === 'play') {
            handleDiscSelection(discId, { queueOnly, allowRetry: false });
        }
    }
}

function exposeDiscObjectUrls() {
    if (typeof window === 'undefined') {
        return;
    }
    const plain = Object.fromEntries(discObjectUrlRegistry.entries());
    Object.defineProperty(window, 'minecraftDiscObjectUrls', {
        value: Object.freeze(plain),
        writable: false,
        configurable: true
    });
}

function releaseDiscObjectUrls() {
    const uniqueUrls = new Set(discObjectUrlRegistry.values());
    for (const url of uniqueUrls) {
        try {
            URL.revokeObjectURL(url);
        } catch (error) {
            /* ignore revocation issues */
        }
    }
    discObjectUrlRegistry.clear();
    exposeDiscObjectUrls();
}

function resetDiscLibraryState() {
    releaseDiscObjectUrls();
    discHashIndex = new Map();
    minecraftAssetsHandles = null;
    markDiscLibraryReady(false);
    setAssetsStatus(DEFAULT_ASSETS_STATUS);
}

function isSystemFolderError(error) {
    if (!error) {
        return false;
    }
    if (error?.name === 'SecurityError') {
        return true;
    }
    const message = String(error?.message || '').toLowerCase();
    if (!message) {
        return false;
    }
    return message.includes('system file') || message.includes('system files');
}

function toAssetKey(discId) {
    if (discId == null) {
        return null;
    }

    const raw = String(discId).trim();
    if (!raw) {
        return null;
    }

    if (DISC_ID_ALIASES.has(raw)) {
        return DISC_ID_ALIASES.get(raw);
    }

    const lower = raw.toLowerCase();
    if (DISC_ID_ALIASES.has(lower)) {
        return DISC_ID_ALIASES.get(lower);
    }

    if (lower.startsWith('music_disc.')) {
        const shortened = lower.slice('music_disc.'.length);
        if (DISC_ID_ALIASES.has(shortened)) {
            return DISC_ID_ALIASES.get(shortened);
        }
        return shortened;
    }

    const sanitized = lower.replace(/[^a-z0-9]/g, '');
    for (const [key, value] of DISC_ID_ALIASES.entries()) {
        const normalizedKey = String(key).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (sanitized && sanitized === normalizedKey) {
            return value;
        }
    }

    return sanitized || lower;
}

function hasDiscLibrary() {
    return discHashIndex.size > 0;
}

async function ensureReadPermission(handle) {
    if (!handle?.queryPermission) {
        return true;
    }

    try {
        const current = await handle.queryPermission({ mode: 'read' });
        if (current === 'granted') {
            return true;
        }
        if (!handle.requestPermission) {
            return false;
        }
        const requested = await handle.requestPermission({ mode: 'read' }).catch(() => current);
        return requested === 'granted';
    } catch (error) {
        return false;
    }
}

async function findLatestIndexFile(indexesHandle) {
    let latest = null;

    for await (const entry of indexesHandle.values()) {
        if (entry?.kind !== 'file') {
            continue;
        }
        if (!entry.name.endsWith('.json')) {
            continue;
        }
        try {
            const file = await entry.getFile();
            if (!file) {
                continue;
            }
            if (!latest || file.lastModified > latest.file.lastModified || (file.lastModified === latest.file.lastModified && entry.name > latest.handle.name)) {
                latest = { handle: entry, file };
            }
        } catch (error) {
            /* ignore unreadable entries */
        }
    }

    return latest;
}

async function getHashedFile(objectsHandle, hash) {
    const prefix = hash.slice(0, 2);
    let bucketHandle;
    try {
        bucketHandle = await objectsHandle.getDirectoryHandle(prefix);
    } catch (error) {
        throw new Error(`Missing objects shard for hash prefix "${prefix}".`);
    }

    try {
        const fileHandle = await bucketHandle.getFileHandle(hash);
        return await fileHandle.getFile();
    } catch (error) {
        throw new Error(`Missing hashed object ${hash}.`);
    }
}

async function buildDiscLibrary(rootHandle) {
    if (!rootHandle) {
        throw new Error('No folder was selected.');
    }

    let assetsRootHandle = rootHandle;
    let indexesHandle = null;
    let objectsHandle = null;

    async function tryResolve(handle) {
        try {
            const indexes = await handle.getDirectoryHandle('indexes');
            const objects = await handle.getDirectoryHandle('objects');
            return { indexes, objects };
        } catch (error) {
            return null;
        }
    }

    let resolved = await tryResolve(assetsRootHandle);

    if (!resolved) {
        try {
            const nestedAssetsHandle = await rootHandle.getDirectoryHandle('assets');
            resolved = await tryResolve(nestedAssetsHandle);
            if (resolved) {
                assetsRootHandle = nestedAssetsHandle;
            }
        } catch (error) {
            /* ignore – handled below */
        }
    }

    if (!resolved) {
        throw new Error('Selected folder does not contain the Minecraft assets directories.');
    }

    indexesHandle = resolved.indexes;
    objectsHandle = resolved.objects;

    const hasRootPermission = await ensureReadPermission(assetsRootHandle);
    const hasIndexPermission = await ensureReadPermission(indexesHandle);
    const hasObjectsPermission = await ensureReadPermission(objectsHandle);

    if (!hasRootPermission || !hasIndexPermission || !hasObjectsPermission) {
        throw new Error('Read access to the selected folder was not granted.');
    }

    const latestIndex = await findLatestIndexFile(indexesHandle);
    if (!latestIndex) {
        throw new Error('No index JSON files were found inside the /indexes directory.');
    }

    let parsed;
    try {
        parsed = JSON.parse(await latestIndex.file.text());
    } catch (error) {
        throw new Error('Failed to parse the latest assets index JSON.');
    }

    const objects = parsed?.objects;
    if (!objects || typeof objects !== 'object') {
        throw new Error('The latest assets index did not contain an objects map.');
    }

    const discs = [];
    for (const [assetPath, meta] of Object.entries(objects)) {
        const match = ASSET_RECORD_PATTERN.exec(assetPath);
        if (!match) {
            continue;
        }

        const discKey = match[1];
        const hash = meta?.hash;
        if (typeof hash !== 'string' || hash.length < 6) {
            continue;
        }

        discs.push({ assetKey: discKey, hash });
    }

    if (!discs.length) {
        throw new Error('No music discs were found in the selected assets index.');
    }

    return {
        discs,
        rootHandle: assetsRootHandle,
        indexesHandle,
        objectsHandle,
        latestIndexName: latestIndex.handle?.name ?? 'latest'
    };
}

function extractDiscEntriesFromIndex(indexData) {
    const objects = indexData?.objects;
    if (!objects || typeof objects !== 'object') {
        throw new Error('The selected assets index did not contain an objects map.');
    }

    const discs = [];
    for (const [assetPath, meta] of Object.entries(objects)) {
        const match = ASSET_RECORD_PATTERN.exec(assetPath);
        if (!match) {
            continue;
        }

        const discKey = match[1];
        const hash = meta?.hash;
        if (typeof hash !== 'string' || hash.length < 6) {
            continue;
        }

        discs.push({ assetKey: discKey, hash });
    }

    if (!discs.length) {
        throw new Error('No music discs were found in the selected assets index.');
    }

    return discs;
}

function sendAssetsSelectionToBackground({ rootHandle, objectsHandle, discIndex, latestIndexName }) {
    if (!chrome?.runtime?.sendMessage) {
        return;
    }

    const payload = {
        type: 'minecraftAssetsSelected',
        assets: {
            rootDirectory: rootHandle,
            objectsDirectory: objectsHandle,
            discIndex: Array.from(discIndex.entries()),
            latestIndexName
        }
    };

    const maybePromise = chrome.runtime.sendMessage(payload);
    if (maybePromise && typeof maybePromise.catch === 'function') {
        maybePromise.catch(() => {});
    }
}

function runtimeSendMessage(payload) {
    return new Promise(resolve => {
        if (!chrome?.runtime?.sendMessage) {
            resolve({ ok: false, response: null });
            return;
        }
        try {
            chrome.runtime.sendMessage(payload, response => {
                if (chrome.runtime.lastError) {
                    console.warn('Failed to send message to background:', chrome.runtime.lastError.message);
                    resolve({ ok: false, response: null });
                    return;
                }
                resolve({ ok: true, response });
            });
        } catch (error) {
            console.warn('Failed to send message to background:', error);
            resolve({ ok: false, response: null });
        }
    });
}

async function sendBlobFile(key, file) {
    const keyString = String(key);
    const mimeType = file?.type || 'audio/ogg';

    if (!file || typeof file.size !== 'number') {
        return false;
    }

    // Convert Blob to base64 for message passing
    let base64Data;
    try {
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
        base64Data = btoa(binaryString);
    } catch (error) {
        console.error('[MinecraftJukebox] Failed to convert file to base64:', error);
        return false;
    }

    const { ok } = await runtimeSendMessage({
        type: 'minecraftAssetBlob',
        key: keyString,
        base64Data: base64Data,
        mimeType
    });
    return ok;
}

async function sendUploadedAssetsToBackground({ discIndex, latestIndexName, blobEntries }) {
    const indexMessage = await runtimeSendMessage({
        type: 'minecraftAssetsUploadedIndex',
        assets: {
            discIndex: Array.from(discIndex.entries()),
            latestIndexName
        }
    });

    if (!indexMessage.ok) {
        console.error('[MinecraftJukebox] Failed to initialize cache');
        setAssetsStatus('Failed to cache discs. Please try again.', 'error');
        return false;
    }

    const uploadedKeys = new Set();

    for (const [key, file] of blobEntries) {
        const keyString = String(key);
        console.log(`[MinecraftJukebox] Sending blob for key: ${keyString}, size: ${file.size} bytes, type: ${file.type}`);
        const success = await sendBlobFile(keyString, file);
        if (!success) {
            console.error('[MinecraftJukebox] Failed to cache blob for key:', keyString);
            setAssetsStatus('Failed to cache discs. Please try again.', 'error');
            await runtimeSendMessage({
                type: 'minecraftAssetsUploadComplete',
                keys: Array.from(uploadedKeys)
            });
            return false;
        }
        console.log(`[MinecraftJukebox] Successfully sent blob for key: ${keyString}`);
        uploadedKeys.add(keyString);
    }

    await runtimeSendMessage({
        type: 'minecraftAssetsUploadComplete',
        keys: Array.from(uploadedKeys)
    });

    console.log(`[MinecraftJukebox] Successfully cached ${uploadedKeys.size} audio files`);
    return true;
}

async function buildDiscLibraryFromFiles({ discs, objectFileMap, latestIndexName }, { persistToBackground = true } = {}) {
    const newHashIndex = new Map();
    const newObjectUrls = new Map();
    const blobEntryMap = new Map();
    const resolvedDiscKeys = new Set();
    const failures = [];

    for (const disc of discs) {
        const { assetKey, hash } = disc;
        if (!assetKey || typeof hash !== 'string') {
            continue;
        }
        const shard = hash.slice(0, 2);
        const relativePath = `objects/${shard}/${hash}`;
        const file = objectFileMap.get(relativePath);
        if (!file) {
            failures.push({ disc, reason: 'missingFile' });
            continue;
        }

        try {
            const objectUrl = URL.createObjectURL(file);
            newHashIndex.set(assetKey, hash);
            newObjectUrls.set(assetKey, objectUrl);
            blobEntryMap.set(assetKey, file);
            resolvedDiscKeys.add(assetKey);
        } catch (error) {
            failures.push({ disc, reason: 'urlCreation', error });
        }
    }

    if (!newObjectUrls.size) {
        throw new Error('Unable to resolve any music discs from the selected assets.');
    }

    releaseDiscObjectUrls();
    discHashIndex = newHashIndex;
    discObjectUrlRegistry = newObjectUrls;
    minecraftAssetsHandles = null;
    exposeDiscObjectUrls();
    markDiscLibraryReady(true);

    const loadedCount = resolvedDiscKeys.size;
    const blobEntries = Array.from(blobEntryMap.entries());

    let persisted = !persistToBackground;

    if (persistToBackground) {
        persisted = await sendUploadedAssetsToBackground({
            discIndex: newHashIndex,
            latestIndexName,
            blobEntries
        });
    }

    return {
        loadedCount,
        failures,
        discIndex: newHashIndex,
        blobEntries,
        latestIndexName,
        persisted
    };
}

async function buildRuntimeDiscLibrary({
    rootHandle = null,
    objectsHandle,
    discs,
    latestIndexName
}) {
    if (!objectsHandle) {
        throw new Error('Missing objects directory handle.');
    }

    const hasObjectsPermission = await ensureReadPermission(objectsHandle);
    if (!hasObjectsPermission) {
        throw new Error('Read access to the objects directory was not granted.');
    }

    const newHashIndex = new Map();
    const newObjectUrls = new Map();
    const resolvedDiscKeys = new Set();
    const failures = [];

    for (const disc of discs) {
        try {
            const file = await getHashedFile(objectsHandle, disc.hash);
            const objectUrl = URL.createObjectURL(file);
            newHashIndex.set(disc.assetKey, disc.hash);
            newObjectUrls.set(disc.assetKey, objectUrl);
            resolvedDiscKeys.add(disc.assetKey);
        } catch (error) {
            failures.push({ disc, error });
        }
    }

    if (!newObjectUrls.size) {
        for (const url of newObjectUrls.values()) {
            try {
                URL.revokeObjectURL(url);
            } catch (revocationError) {
                /* ignore */
            }
        }
        throw new Error('Unable to resolve any music discs from the selected assets.');
    }

    releaseDiscObjectUrls();
    discHashIndex = newHashIndex;
    discObjectUrlRegistry = newObjectUrls;
    minecraftAssetsHandles = {
        root: rootHandle,
        objects: objectsHandle
    };
    exposeDiscObjectUrls();
    markDiscLibraryReady(true);

    sendAssetsSelectionToBackground({
        rootHandle,
        objectsHandle,
        discIndex: newHashIndex,
        latestIndexName
    });

    const loadedCount = resolvedDiscKeys.size;

    return {
        loadedCount,
        failures
    };
}

function getStreamingSources(discId) {
    const desiredKey = toAssetKey(discId);
    if (!desiredKey) {
        return [];
    }

    const candidates = STREAMING_SOURCE_MAP.get(desiredKey);
    if (!Array.isArray(candidates)) {
        return [];
    }

    const normalized = [];
    for (const candidate of candidates) {
        const normalizedUrl = normalizeStreamingUrl(candidate);
        if (normalizedUrl && !normalized.includes(normalizedUrl)) {
            normalized.push(normalizedUrl);
        }
    }
    return normalized;
}

function hasStreamingSource(discId) {
    return getStreamingSources(discId).length > 0;
}

function resolveDiscEntry(discId, { allowStreaming = true } = {}) {
    const desiredKey = toAssetKey(discId);
    if (!desiredKey) {
        return null;
    }

    if (discObjectUrlRegistry.has(desiredKey)) {
        return {
            assetKey: desiredKey,
            objectUrl: discObjectUrlRegistry.get(desiredKey),
            hash: discHashIndex.get(desiredKey) || null
        };
    }

    for (const key of discHashIndex.keys()) {
        if (toAssetKey(key) === desiredKey) {
            return {
                assetKey: key,
                objectUrl: discObjectUrlRegistry.get(key) || null,
                hash: discHashIndex.get(key) || null
            };
        }
    }

    if (!allowStreaming || !isStreamingEnabled()) {
        return null;
    }

    const streamingSources = getStreamingSources(desiredKey);
    if (!streamingSources.length) {
        return null;
    }

    const [primary, ...fallbacks] = streamingSources;
    return {
        assetKey: desiredKey,
        objectUrl: primary,
        streamFallbacks: fallbacks,
        isStream: true
    };
}

if (assetsStatusLabel) {
    setAssetsStatus(assetsStatusLabel.textContent?.trim() || DEFAULT_ASSETS_STATUS);
}

exposeDiscObjectUrls();
updateDiscAvailabilityIndicators();
updateSelectAssetsButtonVisibility();

function markDiscLibraryReady(ready) {
    isDiscLibraryReady = Boolean(ready);
    if (typeof window !== 'undefined') {
        window.isDiscLibraryReady = isDiscLibraryReady;
    }
    updateDiscAvailabilityIndicators();
    updateSelectAssetsButtonVisibility();
    if (isDiscLibraryReady && (!assetsStatusLabel || assetsStatusLabel.textContent === DEFAULT_ASSETS_STATUS)) {
        setAssetsStatus(READY_ASSETS_STATUS);
    }
    if (isDiscLibraryReady) {
        flushPendingDiscActions();
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
    const entry = resolveDiscEntry(discId);
    return entry?.objectUrl ?? null;
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
    const { currentTrack = null, queue: queued = [], history: played = [], progress, volume } = state;

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

    if (typeof volume === 'number') {
        const normalized = Math.min(Math.max(volume, 0), MAX_VOLUME);
        if (normalized > 0.005) {
            lastNonZeroVolume = normalized;
        }
        currentVolume = normalized;
        if (volumeSlider) {
            const sliderValue = Math.round(Math.min(normalized, MAX_VOLUME) * 100);
            if (Number.parseInt(volumeSlider.value, 10) !== sliderValue) {
                volumeSlider.value = String(sliderValue);
            }
        }
        updateVolumeIcon();
    } else {
        updateVolumeIcon();
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

function queueDisc(discId, { allowRetry = true } = {}) {
    if (!discId) return;

    if (isJukeboxDisc(discId)) {
        handleJukeboxSelection({ queueOnly: true });
        return;
    }

    const canStreamImmediately = isStreamingEnabled() && hasStreamingSource(discId);

    if (!isDiscLibraryReady && !canStreamImmediately) {
        if (allowRetry) {
            enqueueDiscAction({ type: 'queue', discId });
            setAssetsStatus(withHint('Upload your Minecraft assets to add this disc.', getAssetsFolderHint()), 'warning');
        }
        return;
    }

    const entry = resolveDiscEntry(discId, { allowStreaming: canStreamImmediately });
    if (!entry) {
        if (canStreamImmediately) {
            setAssetsStatus('Streaming isn’t available for this track. Upload your Minecraft assets to play it.', 'warning');
        } else if (discHashIndex.size === 0) {
            setAssetsStatus(withHint('Choose your Minecraft assets folder before adding discs.', getAssetsFolderHint()), 'warning');
        } else {
            setAssetsStatus(`No local audio found for "${discId}".`, 'error');
        }
        return;
    }

    const payload = {
        type: 'queueDisc',
        discId,
        assetKey: entry.assetKey
    };
    if (entry.objectUrl) {
        payload.objectUrl = entry.objectUrl;
    }
    if (Array.isArray(entry.streamFallbacks) && entry.streamFallbacks.length) {
        payload.streamFallbacks = entry.streamFallbacks;
    }
    if (entry.isStream) {
        payload.isStream = true;
    }

    chrome.runtime.sendMessage(payload);
}

function removeFromQueue(index) {
    chrome.runtime.sendMessage({ type: 'removeFromQueue', index });
}

function reorderQueue(fromIndex, toIndex) {
    chrome.runtime.sendMessage({ type: 'reorderQueue', fromIndex, toIndex });
}

function handleDiscSelection(discId, { queueOnly = false, allowRetry = true } = {}) {
    console.log(`[MinecraftJukebox] Disc selected: ${discId}, queueOnly: ${queueOnly}`);
    console.log(`[MinecraftJukebox] isDiscLibraryReady: ${isDiscLibraryReady}`);
    console.log(`[MinecraftJukebox] discHashIndex.size: ${discHashIndex.size}`);
    console.log(`[MinecraftJukebox] discObjectUrlRegistry.size: ${discObjectUrlRegistry.size}`);

    if (isJukeboxDisc(discId)) {
        handleJukeboxSelection({ queueOnly });
        return;
    }
    
    const canStreamImmediately = isStreamingEnabled() && hasStreamingSource(discId);

    if (!isDiscLibraryReady && !canStreamImmediately) {
        if (allowRetry) {
            enqueueDiscAction({ type: queueOnly ? 'queue' : 'play', discId, queueOnly });
            setAssetsStatus(withHint('Upload your Minecraft assets to play this disc.', getAssetsFolderHint()), 'warning');
        }
        return;
    }
    if (queueOnly) {
        queueDisc(discId, { allowRetry: false });
        return;
    }

    const entry = resolveDiscEntry(discId, { allowStreaming: canStreamImmediately });
    console.log(`[MinecraftJukebox] Resolved entry for ${discId}:`, entry);
    
    if (!entry) {
        if (canStreamImmediately) {
            setAssetsStatus('Streaming isn’t available for this track. Upload your Minecraft assets to play it.', 'warning');
        } else if (discHashIndex.size === 0) {
            setAssetsStatus(withHint('Choose your Minecraft assets folder to play discs.', getAssetsFolderHint()), 'warning');
        } else {
            setAssetsStatus(`No local audio found for "${discId}".`, 'error');
        }
        return;
    }

    console.log(`[MinecraftJukebox] Sending playDisc message for ${discId}`);
    const payload = {
        type: 'playDisc',
        discId,
        assetKey: entry.assetKey
    };
    if (entry.objectUrl) {
        payload.objectUrl = entry.objectUrl;
    }
    if (Array.isArray(entry.streamFallbacks) && entry.streamFallbacks.length) {
        payload.streamFallbacks = entry.streamFallbacks;
    }
    if (entry.isStream) {
        payload.isStream = true;
    }

    chrome.runtime.sendMessage(payload);
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

discElements.forEach(disc => {
    disc.addEventListener('click', event => {
        const discId = disc.getAttribute('data-disc-id');
        if (!discId) {
            return;
        }
        if (disc.classList.contains('disabled')) {
            openDiscHelpPage();
            return;
        }
        const queueOnly = event.shiftKey || event.altKey || event.metaKey;
        handleDiscSelection(discId, { queueOnly });
    });

    disc.addEventListener('contextmenu', event => {
        event.preventDefault();
        const discId = disc.getAttribute('data-disc-id');
        if (!discId) {
            return;
        }
        if (disc.classList.contains('disabled')) {
            openDiscHelpPage();
            return;
        }
        queueDisc(discId);
    });
});

if (discMenuToggle && discMenuPanel) {
    setDiscMenuVisibility(false, { persist: false });
    if (chrome?.storage?.local?.get) {
        try {
            chrome.storage.local.get(['discMenuExpanded'], data => {
                if (data && typeof data.discMenuExpanded !== 'undefined') {
                    setDiscMenuVisibility(Boolean(data.discMenuExpanded), { persist: false });
                }
            });
        } catch (error) {
            /* ignore retrieval issues */
        }
    }
    discMenuToggle.addEventListener('click', () => {
        const isExpanded = discMenuToggle.getAttribute('aria-expanded') === 'true';
        setDiscMenuVisibility(!isExpanded);
    });
}

async function loadMinecraftAssetsFromHandle(rootHandle) {
    const library = await buildDiscLibrary(rootHandle);

    const { loadedCount, failures } = await buildRuntimeDiscLibrary({
        rootHandle: library.rootHandle,
        objectsHandle: library.objectsHandle,
        discs: library.discs,
        latestIndexName: library.latestIndexName
    });

    if (failures.length > 0) {
        const message = loadedCount > 0
            ? 'Loaded discs, but some tracks are missing.'
            : 'Couldn’t load those discs. Please try again.';
        setAssetsStatus(message, 'warning');
        console.warn('Some discs could not be loaded from the selected assets:', failures);
    } else {
        setAssetsStatus('Your discs are ready.', 'success', { autoClear: true, clearDelay: 4000 });
    }

    resizePopupToContent();
}

async function handleAssetsSelection() {
    if (isLoadingAssets) {
        return;
    }

    if (PLATFORM_KEY === 'mac' || PLATFORM_KEY === 'windows') {
        await handleFileUploadAssetsSelection({ reason: 'platformLimited' });
        return;
    }

    if (typeof window.showDirectoryPicker !== 'function') {
        await handleFileUploadAssetsSelection();
        return;
    }

    const hadExistingLibrary = hasDiscLibrary();

    isLoadingAssets = true;
    if (selectAssetsBtn) {
        selectAssetsBtn.disabled = true;
    }

    markDiscLibraryReady(false);

    let directoryHandle = null;

    try {
        const waitingTip = getHiddenFolderTip();
        const waitingMessage = withHint('Choose your Minecraft assets folder so we can find every record.', getAssetsFolderHint());
        setAssetsStatus(waitingTip ? `${waitingMessage} ${waitingTip}` : waitingMessage, 'warning');
        directoryHandle = await window.showDirectoryPicker({ id: 'minecraft-assets-root', mode: 'read' });
        if (!directoryHandle) {
            setAssetsStatus('No folder was picked. Try again when you’re ready.', 'warning');
            return;
        }

        await loadMinecraftAssetsFromHandle(directoryHandle);
    } catch (error) {
        let handledByFallback = false;
        let userCancelledFallback = false;
        if (error?.name === 'AbortError') {
            setAssetsStatus('No folder was picked. Try again when you’re ready.', 'warning');
        } else if (isSystemFolderError(error)) {
            console.warn('Blocked from selecting system-marked folder, attempting fallback flow.');
            try {
                await handleRestrictedAssetsSelection();
                handledByFallback = true;
            } catch (fallbackError) {
                if (fallbackError?.name === 'AbortError') {
                    setAssetsStatus('No folder was picked. Try again when you’re ready.', 'warning');
                    userCancelledFallback = true;
                } else {
                    console.error('Failed to load Minecraft assets (restricted fallback)', fallbackError);
                    setAssetsStatus(fallbackError?.message || 'Failed to load Minecraft assets.', 'error');
                }
            }
            if (!handledByFallback && !userCancelledFallback) {
                const uploadSucceeded = await handleFileUploadAssetsSelection({ reason: 'systemRestricted' });
                handledByFallback = uploadSucceeded;
            }
        } else {
            console.error('Failed to load Minecraft assets', error);
            setAssetsStatus(error?.message || 'Failed to load Minecraft assets.', 'error');
        }

        if (!handledByFallback) {
            if (!hadExistingLibrary) {
                resetDiscLibraryState();
            } else {
                exposeDiscObjectUrls();
            }
        }
    } finally {
        isLoadingAssets = false;
        if (selectAssetsBtn) {
            selectAssetsBtn.disabled = false;
        }
    }
}

async function handleRestrictedAssetsSelection() {
    if (typeof window.showDirectoryPicker !== 'function' || typeof window.showOpenFilePicker !== 'function') {
        throw new Error('Your browser does not support the required file pickers.');
    }

    const objectsHint = getObjectsFolderHint();
    const hiddenTip = getHiddenFolderTip();
    let combinedMessage = withHint('Select your Minecraft assets / objects folder so we can load the discs.', objectsHint);
    if (hiddenTip) {
        combinedMessage = `${combinedMessage} ${hiddenTip}`;
    }
    setAssetsStatus(combinedMessage, 'warning');

    const objectsHandle = await window.showDirectoryPicker({ id: 'minecraft-assets-objects', mode: 'read' });
    if (!objectsHandle) {
        throw new DOMException('Selection cancelled.', 'AbortError');
    }

    const hasObjectsPermission = await ensureReadPermission(objectsHandle);
    if (!hasObjectsPermission) {
        throw new Error('Read access to the objects directory was not granted.');
    }

    const indexesHint = getIndexesFolderHint();
    setAssetsStatus(withHint('Select the latest JSON inside the indexes folder.', indexesHint), 'warning');

    const pickerResult = await window.showOpenFilePicker({
        id: 'minecraft-assets-index',
        multiple: false,
        excludeAcceptAllOption: false,
        types: [{
            description: 'Minecraft asset index',
            accept: { 'application/json': ['.json'] }
        }]
    });

    if (!pickerResult || !pickerResult.length) {
        throw new DOMException('Selection cancelled.', 'AbortError');
    }

    const indexFileHandle = pickerResult[0];
    const hasIndexPermission = await ensureReadPermission(indexFileHandle);
    if (!hasIndexPermission) {
        throw new Error('Read access to the selected assets index was not granted.');
    }

    const indexFile = await indexFileHandle.getFile();
    if (!indexFile) {
        throw new Error('Unable to read the selected assets index file.');
    }

    let parsed;
    try {
        parsed = JSON.parse(await indexFile.text());
    } catch (error) {
        throw new Error('Failed to parse the selected assets index JSON.');
    }

    const discs = extractDiscEntriesFromIndex(parsed);
    const { loadedCount, failures } = await buildRuntimeDiscLibrary({
        rootHandle: null,
        objectsHandle,
        discs,
        latestIndexName: indexFileHandle.name
    });

    if (failures.length) {
        const message = loadedCount > 0
            ? 'Loaded discs, but some tracks are missing.'
            : 'Couldn’t load those discs. Please try again.';
        setAssetsStatus(message, 'warning');
        console.warn('Some discs could not be loaded from the selected assets index:', failures);
    } else {
        setAssetsStatus('Your discs are ready.', 'success', { autoClear: true, clearDelay: 4000 });
    }

    resizePopupToContent();
}

async function handleFileUploadAssetsSelection({ reason = null } = {}) {
    if (isLoadingAssets) {
        return false;
    }

    isLoadingAssets = true;
    if (selectAssetsBtn) {
        selectAssetsBtn.disabled = true;
    }

    markDiscLibraryReady(false);

    const hint = getAssetsFolderHint();
    const tip = getHiddenFolderTip();

    let statusMessage = withHint('Choose your Minecraft assets folder to unlock every classic disc.', hint);
    if (tip) {
        statusMessage = `${statusMessage} ${tip}`;
    }
    setAssetsStatus(statusMessage, 'warning');

    let loadSucceeded = false;

    try {
        const files = await waitForDirectoryUploadSelection(assetsDirectoryInput);
        if (!files.length) {
            setAssetsStatus('Selection cancelled.', 'warning');
            return false;
        }

        setAssetsStatus('Preparing discs…', 'warning');

        const latestIndex = pickLatestIndexFile(files);
        if (!latestIndex) {
            setAssetsStatus('No assets index JSON files were found in the selected folder.', 'error');
            return false;
        }

        let parsed;
        try {
            parsed = JSON.parse(await latestIndex.file.text());
        } catch (error) {
            setAssetsStatus('Failed to parse the selected assets index JSON.', 'error');
            return false;
        }

        const discs = extractDiscEntriesFromIndex(parsed);
        const objectFileMap = collectObjectFiles(files);

        setAssetsStatus('Saving discs…', 'warning');

        let results;
        try {
            results = await buildDiscLibraryFromFiles({
                discs,
                objectFileMap,
                latestIndexName: latestIndex.file.name
            });
        } catch (error) {
            console.error('Failed to process uploaded assets', error);
            setAssetsStatus(error?.message || 'Failed to load the uploaded assets.', 'error');
            return;
        }

        if (results.failures.length) {
            const message = results.loadedCount > 0
                ? 'Loaded discs, but some tracks are missing.'
                : 'Couldn’t load those discs. Please try again.';
            setAssetsStatus(message, 'warning');
            console.warn('Some discs could not be loaded from the uploaded assets:', results.failures);
        } else if (results.persisted) {
            setAssetsStatus('Disc upload successful.', 'success', { autoClear: true, clearDelay: 6000 });
        } else {
            setAssetsStatus('Discs ready now, but upload again to save them.', 'warning');
        }

        resizePopupToContent();
        loadSucceeded = true;
    } catch (error) {
        if (error?.name === 'AbortError') {
            setAssetsStatus('No folder was picked. Try again when you’re ready.', 'warning');
        } else {
            console.error('Failed to upload assets directory', error);
            setAssetsStatus(error?.message || 'Failed to upload assets directory.', 'error');
        }
    } finally {
        isLoadingAssets = false;
        if (selectAssetsBtn) {
            selectAssetsBtn.disabled = false;
        }
    }

    return loadSucceeded;
}

if (selectAssetsBtn) {
    if (typeof window.showDirectoryPicker !== 'function') {
        selectAssetsBtn.disabled = true;
        setAssetsStatus('Your browser does not support selecting local folders.', 'error');
    } else {
        selectAssetsBtn.addEventListener('click', () => {
            handleAssetsSelection().catch(() => {
                /* already handled */
            });
        });
    }
}

async function hydrateDiscLibraryFromBackground(assets = {}) {
    if (discObjectUrlRegistry.size > 0 || isLoadingAssets) {
        return false;
    }

    const {
        objectsDirectory = null,
        discIndex = [],
        latestIndexName,
        hasBlobLibrary = false
    } = assets;

    if (!Array.isArray(discIndex) || !discIndex.length) {
        return false;
    }

    isLoadingAssets = true;
    showDiscLibraryNotReadyStatus();

    try {
        const discs = [];
        const seenKeys = new Set();
        for (const entry of discIndex) {
            if (!Array.isArray(entry) || entry.length < 2) {
                continue;
            }
            const key = typeof entry[0] === 'string' ? entry[0] : String(entry[0] ?? '');
            const hash = typeof entry[1] === 'string' ? entry[1] : null;
            if (!key || !hash || hash.length < 6) {
                continue;
            }
            const canonicalKey = String(key);
            const dedupeKey = toAssetKey(canonicalKey) || canonicalKey;
            if (seenKeys.has(dedupeKey)) {
                continue;
            }
            seenKeys.add(dedupeKey);
            discs.push({ assetKey: canonicalKey, hash });
        }

        if (!discs.length) {
            return false;
        }

        const sourceLabel = latestIndexName ? `cached assets (${latestIndexName})` : 'cached assets';

        if (objectsDirectory) {
            const hasPermission = await ensureReadPermission(objectsDirectory);
            if (hasPermission) {
                try {
                    const { loadedCount, failures } = await buildRuntimeDiscLibrary({
                        rootHandle: null,
                        objectsHandle: objectsDirectory,
                        discs,
                        latestIndexName: latestIndexName || 'cached'
                    });

                    if (failures.length) {
                        const message = loadedCount > 0
                            ? 'Loaded discs, but some tracks are missing.'
                            : 'Couldn’t load those discs. Please try again.';
                        setAssetsStatus(message, 'warning');
                        console.warn('Some discs could not be hydrated from cached assets:', failures);
                    } else {
                        setAssetsStatus(DEFAULT_ASSETS_STATUS);
                    }

                    resizePopupToContent();
                    return true;
                } catch (error) {
                    console.error('Failed to hydrate disc library from cached assets', error);
                }
            }
        }

        if (!hasBlobLibrary) {
            setAssetsStatus(DEFAULT_ASSETS_STATUS);
            return false;
        }

        const objectFileMap = new Map();
        const missingKeys = [];

        for (const disc of discs) {
            const { assetKey, hash } = disc;
            const relativePath = `objects/${hash.slice(0, 2)}/${hash}`;
            if (objectFileMap.has(relativePath)) {
                continue;
            }

            // eslint-disable-next-line no-await-in-loop
            const response = await requestDiscBlob(assetKey);
            if (!response || !(response.blob instanceof Blob)) {
                missingKeys.push(assetKey);
                continue;
            }

            const effectiveHash = typeof response.hash === 'string' && response.hash.length >= 6
                ? response.hash
                : hash;

            const finalPath = `objects/${effectiveHash.slice(0, 2)}/${effectiveHash}`;
            try {
                const file = new File([response.blob], effectiveHash, { type: 'audio/ogg' });
                objectFileMap.set(finalPath, file);
            } catch (error) {
                console.warn('Failed to reconstruct file for', assetKey, error);
                missingKeys.push(assetKey);
            }
        }

        if (!objectFileMap.size) {
            if (missingKeys.length) {
                setAssetsStatus('Couldn’t restore some saved discs.', 'warning');
                console.warn('Missing cached blob entries for discs:', missingKeys, sourceLabel);
            } else {
                setAssetsStatus(DEFAULT_ASSETS_STATUS);
            }
            markDiscLibraryReady(false);
            return false;
        }

        try {
            const { loadedCount, failures } = await buildDiscLibraryFromFiles({
                discs,
                objectFileMap,
                latestIndexName: latestIndexName || 'cached'
            }, { persistToBackground: false });

            const totalFailures = failures.length + missingKeys.length;
            if (totalFailures > 0) {
                const message = loadedCount > 0
                    ? 'Loaded discs, but some tracks are missing.'
                    : 'Couldn’t load those discs. Please try again.';
                setAssetsStatus(message, 'warning');
                if (failures.length) {
                    console.warn('Some discs could not be recreated from cached blobs:', failures);
                }
                if (missingKeys.length) {
                    console.warn('Missing cached blob entries for discs:', missingKeys);
                }
            } else {
                setAssetsStatus(DEFAULT_ASSETS_STATUS);
                markDiscLibraryReady(true);
            }

            resizePopupToContent();
            return true;
        } catch (error) {
            console.error('Failed to rebuild disc library from cached blobs', error);
            markDiscLibraryReady(false);
            return false;
        }
    } finally {
        isLoadingAssets = false;
    }
}

function requestAssetsFromBackground() {
    if (discObjectUrlRegistry.size > 0 || isLoadingAssets) {
        return;
    }

    if (!chrome?.runtime?.sendMessage) {
        return;
    }

    chrome.runtime.sendMessage({ type: 'requestMinecraftAssets' }, response => {
        if (chrome.runtime.lastError) {
            return;
        }
        if (response && response.assets) {
            hydrateDiscLibraryFromBackground(response.assets).catch(() => {
                /* hydration failure already logged */
            });
        }
    });
}

function requestDiscBlob(key) {
    return new Promise(resolve => {
        if (!chrome?.runtime?.sendMessage) {
            resolve(null);
            return;
        }
        chrome.runtime.sendMessage({ type: 'requestDiscBlob', key }, response => {
            if (chrome.runtime.lastError) {
                resolve(null);
                return;
            }
            // Convert base64 back to Blob
            if (response && typeof response.base64Data === 'string') {
                try {
                    const mimeType = response.mimeType || 'audio/ogg';
                    const binaryString = atob(response.base64Data);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    const blob = new Blob([bytes], { type: mimeType });
                    console.log(`[MinecraftJukebox] Reconstructed blob for playback: ${response.key}, size: ${blob.size} bytes, type: ${blob.type}`);
                    resolve({ blob, hash: response.hash, key: response.key });
                } catch (error) {
                    console.error('[MinecraftJukebox] Failed to reconstruct blob from base64:', error);
                    resolve(null);
                }
            } else {
                console.warn('[MinecraftJukebox] No base64 data received for key:', key);
                resolve(response);
            }
        });
    });
}

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
    if (message.type === 'minecraftAssetsStatus') {
        if (typeof message.message === 'string') {
            const variant = message.level === 'success' ? 'success'
                : message.level === 'warning' ? 'warning'
                    : 'error';
            setAssetsStatus(message.message, variant);
            resizePopupToContent();
        }
    }

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

requestAssetsFromBackground();

chrome.storage.local.get(['currentDiscId', 'playbackState', 'uiScale', 'volumeLevel'], data => {
    if (data.uiScale) {
        applyScalePreference(data.uiScale);
    }

    if (typeof data.volumeLevel === 'number') {
        const normalized = Math.min(Math.max(data.volumeLevel, 0), MAX_VOLUME);
        if (normalized > 0.005) {
            lastNonZeroVolume = normalized;
        }
        currentVolume = normalized;
        if (volumeSlider) {
            volumeSlider.value = String(Math.round(Math.min(normalized, MAX_VOLUME) * 100));
        }
        updateVolumeIcon();
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

window.addEventListener('load', () => {
    pingOnPopupOpen();
    resizePopupToContent();
});

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

if (volumeSlider) {
    volumeSlider.addEventListener('input', event => {
        const value = Number.parseInt(event.target.value, 10);
        if (!Number.isFinite(value)) {
            return;
        }
        const normalized = Math.min(Math.max(value / 100, 0), MAX_VOLUME);
        if (Math.abs(normalized - currentVolume) < 0.005) {
            return;
        }
        currentVolume = normalized;
        if (normalized > 0.005) {
            lastNonZeroVolume = normalized;
        }
        chrome.runtime.sendMessage({ type: 'setVolume', volume: normalized });
        updateVolumeIcon();
    });
}

function updateVolumeIcon() {
    if (!volumeIcon) {
        return;
    }
    if (currentVolume <= 0.005) {
        volumeIcon.classList.add('muted');
    } else {
        volumeIcon.classList.remove('muted');
    }
}

function pingOnPopupOpen() {
    if (!PING_ENDPOINT) {
        return;
    }
    fetch(PING_ENDPOINT, { method: 'GET', cache: 'no-store' }).catch(() => {});
}

if (volumeIcon && volumeSlider) {
    volumeIcon.addEventListener('click', () => {
        if (currentVolume <= 0.005) {
            const restored = lastNonZeroVolume > 0.005 ? lastNonZeroVolume : 1;
            const clamped = Math.min(Math.max(restored, 0), MAX_VOLUME);
            currentVolume = clamped;
            if (clamped > 0.005) {
                lastNonZeroVolume = clamped;
            }
            volumeSlider.value = String(Math.round(clamped * 100));
            chrome.runtime.sendMessage({ type: 'setVolume', volume: currentVolume });
        } else {
            if (currentVolume > 0.005) {
                lastNonZeroVolume = currentVolume;
            }
            currentVolume = 0;
            volumeSlider.value = '0';
            chrome.runtime.sendMessage({ type: 'setVolume', volume: 0 });
        }
        updateVolumeIcon();
    });
}

updateVolumeIcon();
