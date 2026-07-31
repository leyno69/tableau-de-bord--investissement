import test from 'node:test';
import assert from 'node:assert/strict';
import { VoiceProfile } from '../../domain/voice/VoiceProfile.js';
import { VoiceAssistantService } from '../../application/services/VoiceAssistantService.js';

test('un profil vocal est immuable et accepte les voix féminines, masculines ou neutres', () => {
  const female = new VoiceProfile({ id: 'fr-f-1', label: 'Claire', gender: 'female' });
  const male = new VoiceProfile({ id: 'fr-m-1', label: 'Hugo', gender: 'male', style: 'calm' });
  assert.equal(female.gender, 'female');
  assert.equal(male.gender, 'male');
  assert.ok(Object.isFrozen(female));
  assert.throws(() => new VoiceProfile({ id: 'x', label: 'X', gender: 'unknown' }), /gender/);
});

test('le service transmet le profil choisi au fournisseur de synthèse vocale', async () => {
  let receivedVoice;
  const service = new VoiceAssistantService({
    wakeWordProvider: { detect: async () => true },
    speechToTextProvider: { transcribe: async () => ({ text: 'Bonjour', confidence: 1 }) },
    assistant: { answer: async () => ({ answer: 'Bonjour Oscar', confidence: 1 }) },
    textToSpeechProvider: { synthesize: async input => { receivedVoice = input.voice; return { bytes: 'audio' }; } }
  });
  const result = await service.handle({
    sessionId: 'voice-profile-1',
    audio: new Uint8Array([1]),
    voiceProfile: { id: 'fr-f-1', label: 'Claire', gender: 'female' }
  });
  assert.equal(receivedVoice.id, 'fr-f-1');
  assert.equal(receivedVoice.gender, 'female');
  assert.equal(result.response.metadata.voice, 'fr-f-1');
});
