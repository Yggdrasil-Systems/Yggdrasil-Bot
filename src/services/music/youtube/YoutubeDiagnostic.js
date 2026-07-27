import Innertube from 'youtubei.js';

/**
 * Run the existing debug-only Innertube diagnostic within the local YouTube
 * boundary. It is intentionally not part of normal stream resolution.
 *
 * @param {import('discord-player').Track} track Track that failed playback.
 * @param {{debug: (message: string) => void, debugError: (message: string, error: unknown) => void}} logger
 * Debug-safe logging callbacks supplied by the music service.
 * @returns {Promise<void>}
 */
export async function runYoutubeDiagnostic(track, { debug, debugError }) {
  try {
    debug(`Running independent youtubei.js diagnostic for track: ${track.title}...`);

    const innertube = await Innertube.create({
      generate_session_locally: true,
      client_type: 'IOS',
      generateWithPoToken: true
    });
    debug(`Innertube initialized. Client: IOS. PoToken attached: ${Boolean(innertube.session.po_token)}`);

    const search = await innertube.search(`${track.title} ${track.author}`, { type: 'video' });
    const videoId = search.results?.[0]?.id;
    if (!videoId) {
      debug('Standalone search found no results.');
      return;
    }

    debug(`Standalone search successful. Video ID: ${videoId}`);
    const info = await innertube.getBasicInfo(videoId);
    const format = info.chooseFormat({ type: 'audio', quality: 'best' });

    debug('Format selected. Attempting decipher...');
    const decipheredUrl = await format.decipher(innertube.session.player);
    debug(`Decipher successful. URL length: ${decipheredUrl?.length}`);
  } catch (error) {
    debugError('youtubei.js standalone diagnostic FAILED:', error);
  }
}
