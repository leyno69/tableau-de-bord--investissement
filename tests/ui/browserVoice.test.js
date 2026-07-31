import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const voice = await readFile(new URL('../../browser-voice.js', import.meta.url), 'utf8');
const sync = await readFile(new URL('../../server-sync.js', import.meta.url), 'utf8');
const worker = await readFile(new URL('../../service-worker.js', import.meta.url), 'utf8');
const staticAssets = await readFile(new URL('../../runtime/server/staticBetaAssets.js', import.meta.url), 'utf8');

test('browser voice uses speech recognition and submits the final transcript', () => {
  assert.match(voice, /SpeechRecognition \|\| globalThis\.webkitSpeechRecognition/);
  assert.match(voice, /instance\.lang = 'fr-FR'/);
  assert.match(voice, /form\.requestSubmit\(\)/);
  assert.match(voice, /voiceRequestPending = true/);
});

test('assistant voice replies use browser speech synthesis', () => {
  assert.match(voice, /SpeechSynthesisUtterance/);
  assert.match(voice, /speechSynthesis\.speak/);
  assert.match(voice, /chooseFrenchVoice/);
});

test('voice bridge is loaded and refreshed by every runtime', () => {
  assert.match(sync, /import '\.\/browser-voice\.js'/);
  assert.match(worker, /leynor-shell-v9/);
  assert.match(worker, /'\/browser-voice\.js'/);
  assert.match(staticAssets, /\['browser-voice\.js', 'text\/javascript; charset=utf-8'\]/);
});

test('deployment exposes an identifiable build marker', () => {
  assert.match(voice, /beta-20260801-voice-proxy/);
  assert.match(voice, /dataset\.leynorBuild = BUILD_ID/);
});
