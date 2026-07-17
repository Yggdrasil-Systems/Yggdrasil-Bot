# Codex Master Execution Guide: YouTube Extraction Architecture

This document provides the canonical blueprint for implementing the WorldTree-Auth YouTube extraction fork.

## 1. Canonical Architectural Decisions [VERIFIED]

### 1.1 Dependency Policy
- **`discord-player`**: MUST remain pinned at `^7.2.0`. Do not install `latest`, `v6`, or `^6.6.0`.
- **`youtubei.js`**: MUST be pinned exactly to `17.2.0` in `package.json`.
- **`discord-player-youtubei`**: Ultimately removed from `package.json`, but ONLY after its internal logic has been successfully ported and compiled.

### 1.2 Routing Model
- **The Only Valid Route**: In `src/services/musicService.js`, when a YouTube URL is matched, the search must be explicitly bound to the new custom extractor using `searchEngine: 'ext:WorldTreeYoutube'`.
- **Prohibited Hacks**:
  - DO NOT invoke `player.extractors.unregisterAll()`.
  - DO NOT manipulate `fallbackSearchEngine` inside `player.search()`.
  - DO NOT mutate the track query text inside the extractor boundary.

### 1.3 `youtubei.js` Canonical API Shape (Abstracted)
- **DO NOT INVENT API SIGNATURES**: Codex must not assume the internal method names (like `download` or `getBasicInfo`) or configuration object structures of `youtubei.js`.
- **Implementation Directive**: Inspect the installed `youtubei.js@17.2.0` API and the source code of the `discord-player-youtubei` bridge. Port the exact upstream usage into the local adapter. Do not invent or alter API signatures. Maintain the core constraint that the PoToken generation utilizes the `WEB` client natively.

### 1.4 Error Model
- **Explicit Error Object**: Do not use brittle string matching (`if (err.message.includes(...))`).
- **Implementation**: When the inner cipher/stream extraction fails in `YoutubeiExtractor.js`, throw a standard `Error` and attach a strict code to it:
  ```javascript
  const error = new Error(`Failed to decipher stream: ${err.message}`);
  error.code = 'YT_EXTRACTION_FAILED';
  throw error;
  ```
- **Service Layer Handling**: Inside `musicService.js`, attach to the `playerError` event. If `error.code === 'YT_EXTRACTION_FAILED'`, completely bypass 0ms fallback playback, short-circuit the queue, and emit a clean "Failed to stream YouTube track" message to the channel.

### 1.5 Retry Policy
The extractor must gracefully handle stream failures by falling back to alternative client identities inside `youtubei.js` before giving up and throwing the `YT_EXTRACTION_FAILED` error.
- **Client Fallback Order**: Try `WEB` first (for robust PoToken support). If extraction fails, automatically retry using `MWEB`, then `IOS`, then `ANDROID`. Only throw the final error if all client types fail.

### 1.6 Testing Stack
- **Framework**: Use the **Node.js Native Test Runner** (`node --test`).
- **Prohibited Frameworks**: DO NOT use Jest, Mocha, Chai, or Nock.

---

## 2. Implementation Playbook (Execution Order)

Codex must strictly follow this physical execution order to prevent dependency breakage:

### Phase 1: Port Logic & Scaffold
1. Create directory `src/services/music/extractors/youtube/`.
2. Create `WorldTreeYoutubeExtractor.js`.
3. Manually copy the exact source code logic from `node_modules/discord-player-youtubei/dist/` (or its repository source) into the new file.
4. Set `static identifier = 'WorldTreeYoutube'`.
5. Adapt the internal `youtubei.js` calls exactly as the upstream wrapper did, injecting the retry loop (`WEB` -> `MWEB` -> `IOS` -> `ANDROID`) and the explicit `error.code = 'YT_EXTRACTION_FAILED'` throw inside the `stream()` method.

### Phase 2: Compilation & Local Verification
1. Run `node --test` or start the bot locally to ensure the new `WorldTreeYoutubeExtractor.js` compiles without syntax errors and correctly imports `youtubei.js`.

### Phase 3: Service Layer Integration
1. Open `src/services/musicService.js`.
2. Update the import path to point to the new local extractor.
3. Replace `player.extractors.register(...)` to register the new local class.
4. Update the `play` search options to use `searchEngine: 'ext:WorldTreeYoutube'` for YouTube URLs.

### Phase 4: Clean Up
1. ONLY after the local extractor is actively running and registered, run `npm uninstall discord-player-youtubei` to purge the redundant wrapper from the repository.

---

## 3. Rollback Plan
If `youtubei.js` introduces an unrecoverable bug in production:
1. Do NOT destroy the `musicService.js` routing architecture (do not revert to `QueryType.AUTO` everywhere).
2. Instead, rollback by simply changing the extractor registration in `musicService.js` (e.g., swapping back to the npm package if needed, or disabling the local YouTube extractor registration). 
3. This isolates the rollback entirely to the extractor layer.
