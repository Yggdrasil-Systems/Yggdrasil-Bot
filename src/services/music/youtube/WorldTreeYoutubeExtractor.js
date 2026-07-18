import { BaseExtractor } from 'discord-player';

/**
 * Local YouTube extractor scaffold for World Tree.
 *
 * Phase 1 defines the public discord-player extractor surface only. It is not
 * registered, imported by runtime code, or backed by any YouTube implementation.
 */
export class WorldTreeYoutubeExtractor extends BaseExtractor {
  static identifier = 'WorldTreeYoutube';

  /**
   * Activate the extractor.
   *
   * TODO: Initialize future YouTube client ownership and stream resolver state.
   */
  async activate() {
    this.protocols = ['yt', 'youtube'];
  }

  /**
   * Deactivate the extractor.
   *
   * TODO: Release future YouTube session, retry, and stream resources.
   */
  async deactivate() {}

  /**
   * Validate whether this extractor owns a query.
   *
   * TODO: Accept only YouTube URLs, YouTube protocols, and explicit YouTube
   * query types.
   */
  async validate() {
    return false;
  }

  /**
   * Resolve YouTube metadata for a query.
   *
   * TODO: Delegate all Track and Playlist construction to YoutubeTrackMapper.
   */
  async handle() {
    return this.createResponse(null, []);
  }

  /**
   * Resolve a playable stream for a YouTube track.
   *
   * TODO: Delegate stream extraction to YoutubeStreamResolver.
   */
  async stream() {
    // TODO (Phase 2): delegate stream extraction to YoutubeStreamResolver.
    return null;
  }

  /**
   * Bridge metadata-only providers, such as Spotify or Apple Music, to YouTube.
   *
   * TODO: Use the source extractor bridge query and stream the selected YouTube
   * result without allowing silent cross-provider fallback.
   */
  async bridge() {
    return null;
  }
}
