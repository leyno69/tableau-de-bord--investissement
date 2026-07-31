import test from 'node:test';
import assert from 'node:assert/strict';
import { Transcript } from '../../domain/voice/Transcript.js';
import { VoiceCommand } from '../../domain/voice/VoiceCommand.js';
import { VoiceSession } from '../../domain/voice/VoiceSession.js';
import { VoiceAssistantService } from '../../application/services/VoiceAssistantService.js';

test('les objets Voice sont immuables et la commande stop est déterministe', () => {
  const transcript = new Transcript({ text: '  Arrête la conversation  ', confidence: 0.9 });
  const command = VoiceCommand.fromTranscript(transcript);
  const session = new VoiceSession({ id: 'voice-1' }).appendTurn({ command });
  assert.equal(transcript.text, 'Arrête la conversation');
  assert.equal(command.intent, 'stop');
  assert.equal(session.turns.length, 1);
  assert.ok(Object.isFrozen(transcript));
  assert.ok(Object.isFrozen(command));
  assert.ok(Object.isFrozen(session));
  assert.ok(Object.isFrozen(session.turns));
});

test('le service ignore un flux sans wake word', async () => {
  const service = new VoiceAssistantService({
    wakeWordProvider: { detect: async () => false },
    speechToTextProvider: { transcribe: async () => { throw new Error('ne doit pas être appelé'); } },
    textToSpeechProvider: { synthesize: async () => { throw new Error('ne doit pas être appelé'); } },
    assistant: { answer: async () => { throw new Error('ne doit pas être appelé'); } }
  });
  const result = await service.handle({ sessionId: 'voice-2', audio: new Uint8Array() });
  assert.equal(result.activated, false);
  assert.equal(result.session.status, 'idle');
});

test('le service orchestre STT, assistant et TTS sans dépendre de leurs fournisseurs', async () => {
  const calls = [];
  const service = new VoiceAssistantService({
    wakeWordProvider: { detect: async input => (calls.push(['wake', input.wakeWord]), true) },
    speechToTextProvider: { transcribe: async () => (calls.push(['stt']), { text: 'Explique le risque de mon portefeuille', confidence: 0.93 }) },
    assistant: { answer: async input => (calls.push(['assistant', input.question]), { answer: 'Votre portefeuille est concentré.', confidence: 0.82, risks: ['Concentration'], model: { provider: 'test' } }) },
    textToSpeechProvider: { synthesize: async input => (calls.push(['tts', input.text]), { bytes: 'audio' }) }
  });
  const result = await service.handle({ sessionId: 'voice-3', audio: new Uint8Array([1]), context: { portfolio: { id: 'p1' } } });
  assert.equal(result.activated, true);
  assert.equal(result.command.intent, 'ask');
  assert.equal(result.response.text, 'Votre portefeuille est concentré.');
  assert.equal(result.response.confidence, 0.82);
  assert.deepEqual(result.response.risks, ['Concentration']);
  assert.equal(result.session.status, 'speaking');
  assert.equal(result.session.turns.length, 1);
  assert.deepEqual(calls.map(call => call[0]), ['wake', 'stt', 'assistant', 'tts']);
});
