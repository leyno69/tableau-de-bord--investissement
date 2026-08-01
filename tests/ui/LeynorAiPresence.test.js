import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readText = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('LEYNOR AI exposes explicit living presence states', async () => {
  const source = await readText('leynor-assistant.js');

  for (const presence of ['idle', 'listening', 'thinking', 'speaking', 'error']) {
    assert.match(source, new RegExp(`${presence}:`));
  }
  assert.match(source, /data-presence|dataset\.presence/);
  assert.match(source, /Que souhaites-tu faire aujourd’hui/);
  assert.match(source, /Conversation libre, finance, portefeuille/);
  assert.match(source, /Ouvrir LEYNOR AI/);
});

test('LEYNOR AI visual language includes halo, stars, waves and reduced motion', async () => {
  const css = await readText('leynor-assistant.css');

  assert.match(css, /leynor-presence-halo/);
  assert.match(css, /leynor-star-one/);
  assert.match(css, /leynor-listen-wave/);
  assert.match(css, /leynor-speak/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /#d6ab53/i);
  assert.match(css, /#071426/i);
});

test('assistant endpoint remains relative for GitHub Pages deployments', async () => {
  const source = await readText('leynor-assistant.js');
  assert.match(source, /fetch\('\.\/leynor\/assistant\/answer'/);
});

test('browser speech prioritizes natural French voices and conversational prosody', async () => {
  const source = await readText('leynor-assistant.js');

  assert.match(source, /function voiceScore/);
  assert.match(source, /premium\|enhanced\|natural\|neural\|studio\|eloquence/);
  assert.match(source, /rate: 0\.94/);
  assert.match(source, /pitch: 0\.98/);
  assert.match(source, /function normalizeTextForSpeech/);
  assert.match(source, /utterance\.rate = settings\.rate/);
  assert.match(source, /utterance\.pitch = settings\.pitch/);
});
