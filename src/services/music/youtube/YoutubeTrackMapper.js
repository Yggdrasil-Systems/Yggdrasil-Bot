/**
 * Placeholder mapper for converting YouTube metadata into discord-player data.
 *
 * This module will own all future Track, Playlist, and SearchResult mapping so
 * YouTube metadata conversion does not become scattered across the extractor.
 */
export class YoutubeTrackMapper {
  /**
   * Build a discord-player Track from a YouTube video object.
   *
   * TODO: Construct Track instances after the local extractor owns youtubei.js.
   */
  buildTrack() {
    // TODO (Phase 2): map a YouTube video object into a discord-player Track.
    return null;
  }

  /**
   * Build a discord-player Playlist from YouTube playlist metadata.
   *
   * TODO: Preserve playlist metadata and attach mapped tracks.
   */
  buildPlaylist() {
    // TODO (Phase 2): map YouTube playlist metadata into a discord-player Playlist.
    return null;
  }

  /**
   * Build a search response payload from YouTube search results.
   *
   * TODO: Return the shape expected by BaseExtractor.createResponse().
   */
  buildSearchResult() {
    // TODO (Phase 2): map YouTube search results into an extractor response payload.
    return { playlist: null, tracks: [] };
  }
}
