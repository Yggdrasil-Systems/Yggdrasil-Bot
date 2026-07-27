# WorldTree Developer Contract: Music Pipeline Invariants

This document establishes the absolute invariants for the YouTube extraction architecture. Over time, as requirements shift and upstream packages break, engineers must obey these constraints to prevent systemic regressions in the WorldTree music pipeline.

## 1. Architectural Boundaries

### 1.1 DO NOT MODIFY `discord-player` CORE
WorldTree only owns three things:
1. `WorldTreeYoutubeExtractor`
2. `musicService.js`
3. The internal test suite.

Everything else remains strictly upstream. Do not attempt to monkey-patch or fork the `discord-player` core repository to force fallback logic or custom internal behaviors. 

### 1.2 The Adapter is the ONLY Boundary
The custom adapter (`WorldTreeYoutubeExtractor.js`) serves as the strict, absolute boundary between `discord-player` and `youtubei.js`. 
- `discord-player` must know nothing about PoTokens, Ciphers, or YouTube's internal algorithms.
- `youtubei.js` must know nothing about Discord voice connections, `Track` models, or queues.

### 1.3 Strict Provider Isolation
Under no circumstances should a YouTube failure silently bridge to SoundCloud or Spotify. 
- The `musicService.js` routing logic MUST enforce explicit engine binding (`searchEngine: 'ext:WorldTreeYoutube'`).
- If YouTube extraction fails, the pipeline MUST break cleanly, bubble the error out, and alert the user.

## 2. Ownership & Dependency Rules

### 2.1 Never Import `youtubei.js` Outside the Extractor
Nothing else in the codebase is permitted to call `youtubei.js` directly.
```
youtubei.js
      ↑
WorldTreeYoutubeExtractor
      ↑
musicService.js
      ↑
Command Handlers
```
If a command handler needs YouTube metadata six months from now, it must ask `musicService.js`, which asks `discord-player`, which delegates to the extractor. Bypassing this hierarchy breaks the architecture.

### 2.2 `musicService` Remains Unaware of Internals
`musicService.js` manages Discord channels, queue playback, and user interactions. It must NEVER parse YouTube cipher errors, configure `WEB` clients, or manage PoTokens. Its only responsibility is setting the `searchEngine` flag and catching the standard `playerError` event.

## 3. Maintenance Policy (When Upstream Breaks)

YouTube frequently changes its cipher algorithms, breaking `youtubei.js`. When this happens, the following maintenance workflow is mandatory:

1. **Update `youtubei.js`**: Bump the version in `package.json` to the latest release containing the upstream fix.
2. **Run Tests**: Execute the native `node --test` suite to verify the update didn't break our internal API usage.
3. **Update the Adapter ONLY**: If the `youtubei.js` API changed (e.g., they renamed a configuration flag), update `WorldTreeYoutubeExtractor.js` to match the new API.
4. **Never Touch `musicService.js`**: The service layer must remain completely untouched during upstream outages.
5. **Never Touch Commands**: The `/play` command handler must remain unaware that YouTube broke.

By isolating the breakage to the adapter, we can restore service in minutes instead of refactoring the entire codebase.
