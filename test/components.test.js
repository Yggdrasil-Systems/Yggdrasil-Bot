import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ButtonStyle } from 'discord.js';

import {
  buildMusicPlayerComponents,
  buildQueueComponents,
  buildSettingsComponents,
  buildFilterComponents
} from '../src/utils/components.js';

test('buildMusicPlayerComponents creates 2 rows of buttons', () => {
  const components = buildMusicPlayerComponents();
  assert.equal(components.length, 2);

  // Row 1: Previous, Pause, Resume, Skip, Settings
  const row1 = components[0].components;
  assert.equal(row1.length, 5);
  assert.equal(row1[0].data.custom_id, 'music_previous');
  assert.equal(row1[1].data.custom_id, 'music_pause');
  assert.equal(row1[2].data.custom_id, 'music_resume');
  assert.equal(row1[3].data.custom_id, 'music_skip');
  assert.equal(row1[4].data.custom_id, 'music_settings');

  // Row 2: Shuffle, Queue, Vol+, Vol-, Stop
  const row2 = components[1].components;
  assert.equal(row2.length, 5);
  assert.equal(row2[0].data.custom_id, 'music_shuffle');
  assert.equal(row2[1].data.custom_id, 'music_queue');
  assert.equal(row2[2].data.custom_id, 'music_volup');
  assert.equal(row2[3].data.custom_id, 'music_voldown');
  assert.equal(row2[4].data.custom_id, 'music_stop');
  assert.equal(row2[4].data.style, ButtonStyle.Danger);
});

test('buildQueueComponents creates shuffle and clear buttons', () => {
  const components = buildQueueComponents();
  assert.equal(components.length, 1);
  const buttons = components[0].components;
  assert.equal(buttons.length, 2);
  assert.equal(buttons[0].data.custom_id, 'music_shuffle');
  assert.equal(buttons[1].data.custom_id, 'queue_clear');
});

test('buildSettingsComponents reflects current loop mode', () => {
  const mockQueue = { repeatMode: 2 }; // Queue loop
  const components = buildSettingsComponents(mockQueue);
  assert.equal(components.length, 1);
  const buttons = components[0].components;
  assert.equal(buttons.length, 5);
  // Loop Queue button should be highlighted (Success style)
  assert.equal(buttons[2].data.custom_id, 'settings_loop_queue');
  assert.equal(buttons[2].data.style, ButtonStyle.Success);
  // Loop Off should NOT be highlighted
  assert.equal(buttons[0].data.style, ButtonStyle.Secondary);
});

test('buildSettingsComponents shows autoplay active state', () => {
  const mockQueue = { repeatMode: 3 }; // Autoplay
  const components = buildSettingsComponents(mockQueue);
  const buttons = components[0].components;
  assert.equal(buttons[3].data.custom_id, 'settings_autoplay');
  assert.equal(buttons[3].data.style, ButtonStyle.Success);
});

test('buildFilterComponents creates filter toggle buttons', () => {
  const components = buildFilterComponents();
  assert.equal(components.length, 1);
  const buttons = components[0].components;
  assert.equal(buttons.length, 5);
  assert.equal(buttons[0].data.custom_id, 'filter_bassboost');
  assert.equal(buttons[4].data.custom_id, 'filter_clear');
  assert.equal(buttons[4].data.style, ButtonStyle.Danger);
});
