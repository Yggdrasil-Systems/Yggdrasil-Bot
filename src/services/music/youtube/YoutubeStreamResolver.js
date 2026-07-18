/**
 * Placeholder for future YouTube stream resolution.
 *
 * Phase 1 intentionally contains no extraction, retry, HTTP, youtubei.js, or
 * yt-dlp logic. The local extractor will delegate stream resolution here in a
 * later phase after tests define the expected behaviour.
 */
export class YoutubeStreamResolver {
  /**
   * Create a resolver instance.
   *
   * TODO: Accept the future YouTube client/session owner and sanitized logger.
   */
  constructor() {}

  /**
   * Resolve a playable stream for a YouTube track.
   *
   * TODO: Mirror the installed upstream retry behaviour with minimal local
   * divergence.
   */
  async resolve() {
    // TODO (Phase 2): resolve a YouTube stream without changing provider behaviour.
    return null;
  }

  /**
   * Release resolver-owned resources.
   *
   * TODO: Clean up future child processes, stream references, and client state.
   */
  async cleanup() {}
}
