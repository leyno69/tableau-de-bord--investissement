import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../../leynor-assistant.js', import.meta.url), 'utf8');

test('LEYNOR exposes a persistent female male and automatic voice selector', () => {
  assert.match(source, /VOICE_PREFERENCES/);
  assert.match(source, /preference: 'female'/);
  assert.match(source, /id="leynorVoicePreference"/);
  assert.match(source, />Féminine</);
  assert.match(source, />Masculine</);
  assert.match(source, />Automatique</);
  assert.match(source, /saveVoicePreference/);
  assert.match(source, /localStorage\.setItem\(VOICE_SETTINGS_KEY/);
});

test('voice ranking prefers the requested inferred gender without excluding fallbacks', () => {
  assert.match(source, /FEMALE_VOICE_PATTERN/);
  assert.match(source, /MALE_VOICE_PATTERN/);
  assert.match(source, /inferredVoiceGender/);
  assert.match(source, /gender === preference/);
  assert.match(source, /chooseFrenchVoice\(settings\.preference\)/);
});
