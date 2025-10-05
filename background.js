const DEFAULT_VOLUME = 1;
const MAX_VOLUME = 3;

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
    ['Default 1hr', 'default_1hr'],
    ['default 1hr', 'default_1hr'],
    ['default_1hr', 'default_1hr'],
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

const minecraftAssetState = {
    rootDirectory: null,
    objectsDirectory: null,
    discIndex: new Map(),
    latestIndexName: null
};

const blobAssetLibrary = new Map();

const MESSAGE_TYPES_EXPECTING_RESPONSE = new Set([
    'minecraftAssetsUploadedIndex',
    'minecraftAssetBlob',
    'minecraftAssetsUploadComplete',
    'requestMinecraftAssets',
    'requestDiscBlob',
    'requestState'
]);

const DISC_INDEX_STORAGE_KEY = 'minecraftDiscIndex';
const BLOB_DB_NAME = 'minecraftJukeboxAssets';
const BLOB_DB_VERSION = 1;
const BLOB_STORE_NAME = 'discBlobs';

let blobDbPromise = null;

function getBlobDb() {
    if (blobDbPromise) {
        return blobDbPromise;
    }

    blobDbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(BLOB_DB_NAME, BLOB_DB_VERSION);
        request.onupgradeneeded = event => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(BLOB_STORE_NAME)) {
                db.createObjectStore(BLOB_STORE_NAME, { keyPath: 'key' });
            }
        };
        request.onsuccess = event => {
            const db = event.target.result;
            db.onclose = () => {
                blobDbPromise = null;
            };
            resolve(db);
        };
        request.onerror = () => {
            reject(request.error);
        };
    }).catch(error => {
        console.warn('Failed to open blob database', error);
        throw error;
    });

    return blobDbPromise;
}

async function storeBlobEntries(entries = []) {
    try {
        const db = await getBlobDb();
        const transaction = db.transaction(BLOB_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(BLOB_STORE_NAME);
        await new Promise((resolve, reject) => {
            transaction.oncomplete = resolve;
            transaction.onerror = () => reject(transaction.error);
            store.clear().onsuccess = () => {
                for (const [key, blob] of entries) {
                    if (!(blob instanceof Blob)) {
                        continue;
                    }
                    store.put({ key, blob });
                }
            };
        });
        if (entries.length > 0) {
            console.log(`[MinecraftJukebox] Cached ${entries.length} audio files to IndexedDB`);
        }
    } catch (error) {
        console.warn('[MinecraftJukebox] Failed to persist blob assets', error);
    }
}

async function loadBlobEntries() {
    try {
        const db = await getBlobDb();
        const transaction = db.transaction(BLOB_STORE_NAME, 'readonly');
        const store = transaction.objectStore(BLOB_STORE_NAME);
        return await new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.warn('Failed to load blob assets', error);
        return [];
    }
}

async function hydrateBlobLibraryFromDb() {
    const records = await loadBlobEntries();
    blobAssetLibrary.clear();
    for (const record of records) {
        if (!record || typeof record.key !== 'string' || !(record.blob instanceof Blob)) {
            continue;
        }
        blobAssetLibrary.set(record.key, { blob: record.blob, objectUrl: null });
    }
    if (blobAssetLibrary.size > 0) {
        console.log(`[MinecraftJukebox] Restored ${blobAssetLibrary.size} cached audio files from IndexedDB`);
    }
}

async function verifyBlobStorage() {
    try {
        const records = await loadBlobEntries();
        console.log(`[MinecraftJukebox] VERIFICATION: IndexedDB contains ${records.length} blob records`);
        for (const record of records) {
            if (record && record.blob instanceof Blob) {
                console.log(`[MinecraftJukebox] VERIFICATION: Key "${record.key}" -> Blob size: ${record.blob.size} bytes`);
            } else {
                console.warn(`[MinecraftJukebox] VERIFICATION: Key "${record?.key}" has invalid blob`);
            }
        }
    } catch (error) {
        console.error('[MinecraftJukebox] Failed to verify blob storage:', error);
    }
}

async function storeSingleBlobEntry(key, blob) {
    try {
        const db = await getBlobDb();
        const transaction = db.transaction(BLOB_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(BLOB_STORE_NAME);
        const putRequest = store.put({ key, blob });
        
        await new Promise((resolve, reject) => {
            transaction.oncomplete = () => {
                console.log(`[MinecraftJukebox] Stored blob for key: ${key}, size: ${blob.size} bytes`);
                resolve();
            };
            transaction.onerror = () => reject(transaction.error);
            putRequest.onerror = () => reject(putRequest.error);
        });
    } catch (error) {
        console.error('[MinecraftJukebox] Failed to persist blob asset for key:', key, error);
        throw error;
    }
}

async function hydrateDiscIndexFromStorage() {
    try {
        const stored = await chrome.storage.local.get(DISC_INDEX_STORAGE_KEY);
        const entry = stored?.[DISC_INDEX_STORAGE_KEY];
        if (!entry) {
            return;
        }
        const { discIndex = [], latestIndexName = null } = entry;
        if (Array.isArray(discIndex) && discIndex.length) {
            const reconstructed = discIndex
                .filter(item => Array.isArray(item) && item.length >= 2)
                .map(([key, hash]) => {
                    const normalizedKey = typeof key === 'string' ? key : String(key ?? '');
                    const normalizedHash = typeof hash === 'string' ? hash : null;
                    return [normalizedKey, normalizedHash];
                })
                .filter(([key, hash]) => key && typeof hash === 'string' && hash.length >= 6);
            if (reconstructed.length) {
                minecraftAssetState.discIndex = new Map(reconstructed);
            }
        }
        if (latestIndexName) {
            minecraftAssetState.latestIndexName = latestIndexName;
        }
    } catch (error) {
        // ignore hydration errors
    }
}

let expectedBlobKeys = new Set();
let blobLibraryReadyResolve = null;

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

let discLibraryReady = hydrateDiscIndexFromStorage();
let blobLibraryReady = hydrateBlobLibraryFromDb();

const stateReady = loadStateFromStorage();
let hasActiveAudioSession = false;
let volumeLevel = DEFAULT_VOLUME;

function beginBlobUploadWait() {
    blobLibraryReady = new Promise(resolve => {
        blobLibraryReadyResolve = resolve;
    });
}

function finishBlobUploadWait() {
    if (blobLibraryReadyResolve) {
        blobLibraryReadyResolve();
        blobLibraryReadyResolve = null;
    }
}

function toAssetKey(value) {
    if (value == null) {
        return null;
    }
    const raw = String(value).trim();
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
    for (const [key, aliasValue] of DISC_ID_ALIASES.entries()) {
        const normalizedKey = String(key).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (sanitized && sanitized === normalizedKey) {
            return aliasValue;
        }
    }
    return sanitized || lower;
}

function hasDiscLibrary() {
    const hasHandles = Boolean(minecraftAssetState.objectsDirectory && minecraftAssetState.discIndex.size > 0);
    const hasBlobs = blobAssetLibrary.size > 0;
    return hasHandles || hasBlobs;
}

function resolveAssetKey(candidate) {
    const desired = toAssetKey(candidate);
    if (!desired) {
        return null;
    }
    if (minecraftAssetState.discIndex.has(desired)) {
        return desired;
    }
    for (const key of minecraftAssetState.discIndex.keys()) {
        if (toAssetKey(key) === desired) {
            return key;
        }
    }
    return minecraftAssetState.discIndex.has(candidate) ? candidate : null;
}

function setDiscLibrary(assets = {}) {
    const { rootDirectory = null, objectsDirectory = null, discIndex = [], latestIndexName = null } = assets;
    minecraftAssetState.rootDirectory = rootDirectory || null;
    minecraftAssetState.objectsDirectory = objectsDirectory || null;
    minecraftAssetState.latestIndexName = latestIndexName || null;

    if (objectsDirectory) {
        releaseBlobAssets();
    }

    const entries = Array.isArray(discIndex)
        ? discIndex
        : Object.entries(discIndex || {});

    const newIndex = new Map();
    for (const [key, hash] of entries) {
        if (typeof hash === 'string' && hash.length >= 6) {
            newIndex.set(String(key), hash);
        }
    }
    minecraftAssetState.discIndex = newIndex;

    if (newIndex.size) {
        chrome.storage.local.set({
            [DISC_INDEX_STORAGE_KEY]: {
                discIndex: Array.from(newIndex.entries()),
                latestIndexName: minecraftAssetState.latestIndexName || null
            }
        }).catch(() => {});
    } else {
        chrome.storage.local.remove(DISC_INDEX_STORAGE_KEY).catch(() => {});
    }

    // eslint-disable-next-line require-atomic-updates
    discLibraryReady = Promise.resolve();
}

function notifyAssetsIssue(message, { level = 'error', discId = null } = {}) {
    const payload = { type: 'minecraftAssetsStatus', message, level, discId: discId || undefined };
    const maybePromise = chrome.runtime.sendMessage(payload);
    if (maybePromise && typeof maybePromise.catch === 'function') {
        maybePromise.catch(() => {});
    }
}

function releaseBlobAssets() {
    for (const entry of blobAssetLibrary.values()) {
        if (entry?.objectUrl) {
            try {
                URL.revokeObjectURL(entry.objectUrl);
            } catch (error) {
                /* ignore revoke errors */
            }
        }
    }
    blobAssetLibrary.clear();
}

async function getDiscFile(assetKey) {
    if (!hasDiscLibrary()) {
        return null;
    }

    const resolvedKey = resolveAssetKey(assetKey);
    if (!resolvedKey) {
        return null;
    }

    const hash = minecraftAssetState.discIndex.get(resolvedKey);
    if (typeof hash !== 'string') {
        return null;
    }

    const objectsHandle = minecraftAssetState.objectsDirectory;
    if (!objectsHandle) {
        return null;
    }

    try {
        const prefix = hash.slice(0, 2);
        const bucketHandle = await objectsHandle.getDirectoryHandle(prefix);
        const fileHandle = await bucketHandle.getFileHandle(hash);
        return await fileHandle.getFile();
    } catch (error) {
        console.warn('Failed to resolve hashed asset', resolvedKey, error);
        return null;
    }
}

function sanitizeTrack(track) {
    if (!track || typeof track !== 'object') {
        return null;
    }

    const discId = typeof track.discId === 'string' ? track.discId : null;
    if (!discId) {
        return null;
    }

    const providedAssetKey = typeof track.assetKey === 'string' && track.assetKey ? track.assetKey : null;
    const objectUrl = typeof track.objectUrl === 'string' ? track.objectUrl : null;

    let assetKey = providedAssetKey || toAssetKey(discId);
    if (!assetKey && objectUrl) {
        assetKey = toAssetKey(discId);
    }

    if (!assetKey) {
        return null;
    }

    return {
        discId,
        assetKey,
        objectUrl
    };
}

function sanitizeTrackList(list) {
    if (!Array.isArray(list)) {
        return [];
    }
    return list.map(sanitizeTrack).filter(Boolean);
}

function createPersistedTrack(track) {
    const sanitized = sanitizeTrack(track);
    if (!sanitized) {
        return null;
    }
    const persisted = { discId: sanitized.discId, assetKey: sanitized.assetKey };
    if (sanitized.objectUrl) {
        persisted.objectUrl = sanitized.objectUrl;
    }
    return persisted;
}

function clampVolume(value) {
    if (!Number.isFinite(value)) {
        return DEFAULT_VOLUME;
    }
    return Math.min(Math.max(value, 0), MAX_VOLUME);
}

async function loadStateFromStorage() {
    try {
        const stored = await chrome.storage.local.get(['playbackState', 'volumeLevel']);
        if (stored && stored.playbackState) {
            const { currentTrack = null, queue = [], history = [] } = stored.playbackState;
            playbackState.currentTrack = sanitizeTrack(currentTrack);
            playbackState.queue = sanitizeTrackList(queue);
            playbackState.history = sanitizeTrackList(history);
            playbackState.progress = {
                currentTime: 0,
                duration: 0,
                isPlaying: false
            };
            hasActiveAudioSession = false;
        }
        if (stored && typeof stored.volumeLevel === 'number') {
            volumeLevel = clampVolume(stored.volumeLevel);
        }
    } catch (error) {
        // Ignore storage load issues.
    }
}

async function playSound({ blob = null, source = null, volume = DEFAULT_VOLUME, discId = null } = {}) {
    console.log(`[MinecraftJukebox] playSound called for ${discId}`);
    console.log(`[MinecraftJukebox] blob:`, blob);
    console.log(`[MinecraftJukebox] blob size:`, blob?.size);
    console.log(`[MinecraftJukebox] blob type:`, blob?.type);
    console.log(`[MinecraftJukebox] source:`, source);
    console.log(`[MinecraftJukebox] volume:`, volume);
    
    await createOffscreen();
    const payload = { play: { volume, discId } };
    
    if (blob instanceof Blob) {
        // Convert blob to base64 for message passing
        try {
            const arrayBuffer = await blob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
            const base64Data = btoa(binaryString);
            payload.play.base64Data = base64Data;
            payload.play.mimeType = blob.type || 'audio/ogg';
            console.log(`[MinecraftJukebox] Converted blob to base64, size: ${blob.size} bytes`);
        } catch (error) {
            console.error(`[MinecraftJukebox] Failed to convert blob to base64:`, error);
            return;
        }
    }
    
    if (typeof source === 'string') {
        payload.play.source = source;
        console.log(`[MinecraftJukebox] Sending source to offscreen: ${source}`);
    }
    
    console.log(`[MinecraftJukebox] Sending play message to offscreen`);
    await chrome.runtime.sendMessage(payload).catch(error => {
        console.error(`[MinecraftJukebox] Failed to send play message to offscreen:`, error);
    });
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
        currentTrack: createPersistedTrack(playbackState.currentTrack),
        queue: playbackState.queue.map(createPersistedTrack).filter(Boolean),
        history: playbackState.history.map(createPersistedTrack).filter(Boolean),
        progress: { ...playbackState.progress },
        volume: volumeLevel
    };
}

function persistState() {
    const baseState = {
        currentTrack: createPersistedTrack(playbackState.currentTrack),
        queue: playbackState.queue.map(createPersistedTrack).filter(Boolean),
        history: playbackState.history.map(createPersistedTrack).filter(Boolean)
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

function updateVolumeStorage(level) {
    return chrome.storage.local.set({ volumeLevel: level }).catch(() => {});
}

function applyVolumeLevel(level, { persist = true, notify = true } = {}) {
    const clamped = clampVolume(level);
    if (clamped === volumeLevel) {
        if (persist) {
            updateVolumeStorage(clamped);
        }
        return volumeLevel;
    }

    volumeLevel = clamped;

    if (persist) {
        updateVolumeStorage(clamped);
    }

    if (notify) {
        sendToOffscreen({ setVolume: clamped });
        broadcastState();
    }

    return volumeLevel;
}


async function playTrack(track, { pushCurrentToHistory = true } = {}) {
    const sanitized = sanitizeTrack(track);
    if (!sanitized) {
        return false;
    }

    const { discId, assetKey } = sanitized;

    let sourceBlob = null;

    const blobEntry = blobAssetLibrary.get(assetKey);
    if (blobEntry && blobEntry.blob instanceof Blob) {
        sourceBlob = blobEntry.blob;
        console.log(`[MinecraftJukebox] Using cached blob for ${discId}, size: ${sourceBlob.size} bytes`);
    } else {
        console.log(`[MinecraftJukebox] No cached blob found for ${discId}, will try file handle`);
    }

    if (!sourceBlob) {
        const file = await getDiscFile(assetKey).catch(() => null);
        if (file) {
            sourceBlob = file;
            console.log(`[MinecraftJukebox] Using file handle for ${discId}, size: ${file.size} bytes`);
        } else {
            console.error(`[MinecraftJukebox] No audio source found for ${discId}`);
            notifyAssetsIssue(`Unable to load audio for ${discId}.`, { level: 'error', discId });
            return false;
        }
    }

    if (pushCurrentToHistory && playbackState.currentTrack) {
        playbackState.history.push(playbackState.currentTrack);
    }

    const currentTrackRecord = { discId, assetKey };
    playbackState.currentTrack = currentTrackRecord;
    playbackState.progress = {
        currentTime: 0,
        duration: 0,
        isPlaying: false
    };

    console.log(`[MinecraftJukebox] Playing ${discId} with blob size: ${sourceBlob.size} bytes`);
    await playSound({ blob: sourceBlob, volume: volumeLevel, discId });
    hasActiveAudioSession = true;
    await persistState();
    broadcastState();
    return true;
}

async function advanceQueue({ shouldStopCurrent = false } = {}) {
    const previousTrack = playbackState.currentTrack;

    if (previousTrack) {
        playbackState.history.push(previousTrack);
    }

    let nextTrack = playbackState.queue.shift();

    while (nextTrack) {
        const played = await playTrack(nextTrack, { pushCurrentToHistory: false });
        if (played) {
            return;
        }
        nextTrack = playbackState.queue.shift();
    }

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
    const { discId } = message;
    console.log(`[MinecraftJukebox] handlePlayDisc called for: ${discId}`);
    console.log(`[MinecraftJukebox] hasDiscLibrary(): ${hasDiscLibrary()}`);
    console.log(`[MinecraftJukebox] blobAssetLibrary.size: ${blobAssetLibrary.size}`);
    console.log(`[MinecraftJukebox] minecraftAssetState.discIndex.size: ${minecraftAssetState.discIndex.size}`);
    
    if (!discId) return;

    const providedUrl = typeof message.objectUrl === 'string' ? message.objectUrl : null;
    const resolvedKey = resolveAssetKey(message.assetKey ?? discId) || (providedUrl ? toAssetKey(discId) : null);
    
    console.log(`[MinecraftJukebox] providedUrl: ${providedUrl}`);
    console.log(`[MinecraftJukebox] resolvedKey: ${resolvedKey}`);

    if (!hasDiscLibrary() && !providedUrl) {
        console.log(`[MinecraftJukebox] No disc library and no provided URL`);
        notifyAssetsIssue('Select your Minecraft assets folder before playing.', { level: 'warning', discId });
        return;
    }

    if (!resolvedKey && !providedUrl) {
        console.log(`[MinecraftJukebox] No resolved key and no provided URL`);
        notifyAssetsIssue(`No local audio found for ${discId}.`, { level: 'error', discId });
        return;
    }

    const track = sanitizeTrack({ discId, assetKey: resolvedKey, objectUrl: providedUrl });
    console.log(`[MinecraftJukebox] Sanitized track:`, track);
    
    if (!track) {
        notifyAssetsIssue(`Unable to queue ${discId}.`, { level: 'error', discId });
        return;
    }

    const pushHistory = Boolean(playbackState.currentTrack && playbackState.currentTrack.discId !== discId);
    console.log(`[MinecraftJukebox] Calling playTrack with pushHistory: ${pushHistory}`);
    await playTrack(track, { pushCurrentToHistory: pushHistory });
}

async function handleQueueDisc(message) {
    const { discId } = message;
    if (!discId) return;

    const providedUrl = typeof message.objectUrl === 'string' ? message.objectUrl : null;
    const resolvedKey = resolveAssetKey(message.assetKey ?? discId) || (providedUrl ? toAssetKey(discId) : null);

    if (!hasDiscLibrary() && !providedUrl) {
        notifyAssetsIssue('Select your Minecraft assets folder before adding to the queue.', { level: 'warning', discId });
        return;
    }

    if (!resolvedKey && !providedUrl) {
        notifyAssetsIssue(`No local audio found for ${discId}.`, { level: 'error', discId });
        return;
    }

    const track = sanitizeTrack({ discId, assetKey: resolvedKey, objectUrl: providedUrl });
    if (!track) {
        notifyAssetsIssue(`Unable to queue ${discId}.`, { level: 'error', discId });
        return;
    }

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
    const previousTrack = sanitizeTrack(playbackState.history.pop());

    if (playbackState.currentTrack) {
        const currentCopy = sanitizeTrack(playbackState.currentTrack);
        if (currentCopy) {
            playbackState.queue.unshift(currentCopy);
        }
    }
    if (previousTrack) {
        await playTrack(previousTrack, { pushCurrentToHistory: false });
    }
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
        const sanitized = sanitizeTrack({ discId, assetKey: resolveAssetKey(discId) || undefined });
        if (sanitized) {
            playbackState.currentTrack = sanitized;
        }
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const expectsResponse = MESSAGE_TYPES_EXPECTING_RESPONSE.has(message?.type);
    let didSendResponse = false;
    const safeSendResponse = response => {
        if (didSendResponse) {
            return;
        }
        didSendResponse = true;
        try {
            sendResponse(response);
        } catch (error) {
            console.error('[MinecraftJukebox] Failed to send response for message type:', message?.type, error);
        }
    };

    (async () => {
        await stateReady;
        await discLibraryReady;

        const skipBlobWaitTypes = new Set([
            'minecraftAssetsUploadedIndex',
            'minecraftAssetBlob',
            'minecraftAssetsUploadComplete'
        ]);

        if (!skipBlobWaitTypes.has(message.type)) {
            await blobLibraryReady.catch(() => {});
        }

        switch (message.type) {
            case 'minecraftAssetsSelected':
                setDiscLibrary(message.assets);
                break;
            case 'minecraftAssetsUploadedIndex': {
                const assets = message.assets || {};
                const discIndex = Array.isArray(assets.discIndex) ? assets.discIndex : [];
                const latestIndexName = assets.latestIndexName || null;

                releaseBlobAssets();
                blobAssetLibrary.clear();
                expectedBlobKeys = new Set();

                for (const entry of discIndex) {
                    if (Array.isArray(entry) && entry.length) {
                        expectedBlobKeys.add(String(entry[0]));
                    }
                }

                beginBlobUploadWait();
                await storeBlobEntries([]);

                setDiscLibrary({
                    rootDirectory: null,
                    objectsDirectory: null,
                    discIndex,
                    latestIndexName
                });

                if (expectedBlobKeys.size === 0) {
                    finishBlobUploadWait();
                }

                safeSendResponse({ ok: true });
                return;
            }
            case 'minecraftAssetBlob': {
                const key = typeof message.key === 'string' ? message.key : String(message.key ?? '');
                const base64Data = message.base64Data;
                const mimeType = typeof message.mimeType === 'string' ? message.mimeType : 'audio/ogg';
                
                if (!key || typeof base64Data !== 'string' || !base64Data) {
                    console.error('[MinecraftJukebox] Invalid blob message for key:', key, 'base64Data type:', typeof base64Data);
                    safeSendResponse({ ok: false });
                    return;
                }

                // Reconstruct Blob from base64
                let blob;
                try {
                    const binaryString = atob(base64Data);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    blob = new Blob([bytes], { type: mimeType });
                    console.log(`[MinecraftJukebox] Reconstructed blob for key: ${key}, size: ${blob.size} bytes, type: ${blob.type}`);
                } catch (error) {
                    console.error('[MinecraftJukebox] Failed to decode base64 for key:', key, error);
                    safeSendResponse({ ok: false });
                    return;
                }

                blobAssetLibrary.set(key, { blob: blob, objectUrl: null });
                expectedBlobKeys.delete(key);

                await storeSingleBlobEntry(key, blob);

                if (expectedBlobKeys.size === 0) {
                    finishBlobUploadWait();
                }

                safeSendResponse({ ok: true });
                return;
            }
            case 'minecraftAssetsUploadComplete': {
                const keys = Array.isArray(message.keys) ? message.keys.map(item => String(item ?? '')) : [];
                for (const key of keys) {
                    expectedBlobKeys.delete(key);
                }
                if (expectedBlobKeys.size === 0) {
                    finishBlobUploadWait();
                    // Verify storage
                    verifyBlobStorage().catch(() => {});
                } else if (expectedBlobKeys.size > 0) {
                    console.warn('[MinecraftJukebox] Missing uploaded disc blobs for keys:', Array.from(expectedBlobKeys));
                    expectedBlobKeys.clear();
                    finishBlobUploadWait();
                }
                safeSendResponse({ completed: true });
                return;
            }
            case 'requestMinecraftAssets': {
                const hasAssets = hasDiscLibrary();
                const responsePayload = hasAssets
                    ? {
                        assets: {
                            discIndex: Array.from(minecraftAssetState.discIndex.entries()),
                            latestIndexName: minecraftAssetState.latestIndexName,
                            objectsDirectory: minecraftAssetState.objectsDirectory,
                            hasBlobLibrary: blobAssetLibrary.size > 0
                        }
                    }
                    : { assets: null };
                safeSendResponse(responsePayload);
                return;
            }
            case 'requestDiscBlob': {
                const requestedKey = typeof message.key === 'string' ? message.key : String(message.key ?? '');
                const normalizedKey = toAssetKey(requestedKey) || requestedKey;
                let entry = blobAssetLibrary.get(normalizedKey);
                if (!entry && normalizedKey !== requestedKey) {
                    entry = blobAssetLibrary.get(requestedKey);
                }
                const hash = minecraftAssetState.discIndex.get(normalizedKey) || minecraftAssetState.discIndex.get(requestedKey) || null;
                if (entry?.blob instanceof Blob) {
                    // Convert Blob to base64 for message passing
                    entry.blob.arrayBuffer().then(arrayBuffer => {
                        const uint8Array = new Uint8Array(arrayBuffer);
                        const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
                        const base64Data = btoa(binaryString);
                        safeSendResponse({ 
                            key: normalizedKey, 
                            base64Data: base64Data,
                            mimeType: entry.blob.type || 'audio/ogg',
                            hash 
                        });
                    }).catch(error => {
                        console.error('[MinecraftJukebox] Failed to convert blob to base64:', error);
                        safeSendResponse({ key: normalizedKey, base64Data: null, hash: null });
                    });
                } else {
                    safeSendResponse({ key: normalizedKey, base64Data: null, hash: null });
                }
                return;
            }
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
            case 'setVolume':
                applyVolumeLevel(message.volume);
                break;
            case 'requestState':
                safeSendResponse(getStateSnapshot());
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
    })().catch(error => {
        console.error('[MinecraftJukebox] Failed to process message type:', message?.type, error);
        if (expectsResponse && !didSendResponse) {
            safeSendResponse({ ok: false });
        }
    });
    return expectsResponse;
});

chrome.runtime.onInstalled.addListener(() => {
    persistState();
});
