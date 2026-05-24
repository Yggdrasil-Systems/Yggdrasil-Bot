import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ButtonStyle } from 'discord.js';

import { buildMusicPlayerComponents, buildMusicFallbackComponents, buildQueueComponents, resolveQuery } from '../src/utils/components.js';

test('buildMusicPlayerComponents creates player control buttons', () => {
  const components = buildMusicPlayerComponents();
  assert.equal(components.length, 1);
  const row = components[0];
  
  const buttons = row.components;
  assert.equal(buttons.length, 5);
  
  assert.equal(buttons[0].data.custom_id, 'music_previous');
  assert.equal(buttons[0].data.label, 'Previous');
  
  assert.equal(buttons[1].data.custom_id, 'music_pause');
  assert.equal(buttons[1].data.label, 'Pause');

  assert.equal(buttons[2].data.custom_id, 'music_stop');
  assert.equal(buttons[3].data.custom_id, 'music_skip');
  assert.equal(buttons[4].data.custom_id, 'music_loop');
});

test('buildMusicFallbackComponents creates search fallback buttons with short IDs', () => {
  const query = 'test query';
  const components = buildMusicFallbackComponents(query);
  assert.equal(components.length, 1);
  const row = components[0];
  
  const buttons = row.components;
  assert.equal(buttons.length, 4);
  
  // Short queries use URL-encoded value directly
  assert.equal(buttons[0].data.custom_id, `msf_sp_${encodeURIComponent(query)}`);
  assert.equal(buttons[0].data.label, 'Spotify');
  
  assert.equal(buttons[1].data.custom_id, `msf_ap_${encodeURIComponent(query)}`);
  assert.equal(buttons[1].data.label, 'Apple Music');
  
  assert.equal(buttons[2].data.custom_id, `msf_yt_${encodeURIComponent(query)}`);
  assert.equal(buttons[2].data.label, 'YouTube');
  
  assert.equal(buttons[3].data.custom_id, `msf_sc_${encodeURIComponent(query)}`);
  assert.equal(buttons[3].data.label, 'SoundCloud');
});

test('buildMusicFallbackComponents handles long URLs with hash-based IDs', () => {
  const longUrl = 'https://open.spotify.com/track/5O2P9iiztwhomNh8xkR9lJ?si=65279014e403480e';
  const components = buildMusicFallbackComponents(longUrl);
  const buttons = components[0].components;
  
  // All button custom IDs should be under 100 characters
  for (const button of buttons) {
    assert.ok(button.data.custom_id.length <= 100, `Custom ID too long: ${button.data.custom_id.length} chars`);
  }
  
  // The hash-based ID should be resolvable back to the original query
  const spotifyId = buttons[0].data.custom_id; // msf_sp_h_<hash>
  const queryKey = spotifyId.replace('msf_sp_', '');
  const resolved = resolveQuery(queryKey);
  assert.equal(resolved, longUrl);
});

test('buildQueueComponents creates shuffle and clear buttons', () => {
  const components = buildQueueComponents();
  assert.equal(components.length, 1);
  const buttons = components[0].components;
  assert.equal(buttons.length, 2);
  assert.equal(buttons[0].data.custom_id, 'music_shuffle');
  assert.equal(buttons[1].data.custom_id, 'music_clear');
});
