import { Transcript } from '../../domain/voice/Transcript.js';
import { VoiceCommand } from '../../domain/voice/VoiceCommand.js';
import { VoiceResponse } from '../../domain/voice/VoiceResponse.js';
import { VoiceSession } from '../../domain/voice/VoiceSession.js';
import { VoiceProfile } from '../../domain/voice/VoiceProfile.js';

function requireMethod(dependency, method, name) {
  if (!dependency || typeof dependency[method] !== 'function') throw new TypeError(`${name} doit exposer ${method}().`);
}

export class VoiceAssistantService {
  constructor({ speechToTextProvider, textToSpeechProvider, wakeWordProvider, assistant } = {}) {
    requireMethod(speechToTextProvider, 'transcribe', 'speechToTextProvider');
    requireMethod(textToSpeechProvider, 'synthesize', 'textToSpeechProvider');
    requireMethod(wakeWordProvider, 'detect', 'wakeWordProvider');
    requireMethod(assistant, 'answer', 'assistant');
    this.speechToTextProvider = speechToTextProvider;
    this.textToSpeechProvider = textToSpeechProvider;
    this.wakeWordProvider = wakeWordProvider;
    this.assistant = assistant;
    Object.freeze(this);
  }

  async handle({ sessionId, audio, context = {}, wakeWord = 'Dis LEYNOR', voiceProfile = null } = {}) {
    const selectedVoice = voiceProfile instanceof VoiceProfile ? voiceProfile : voiceProfile ? new VoiceProfile(voiceProfile) : null;
    const detected = await this.wakeWordProvider.detect({ audio, wakeWord });
    let session = new VoiceSession({ id: sessionId, wakeWord });
    if (!detected) return Object.freeze({ activated: false, session });

    session = session.withStatus('listening');
    const rawTranscript = await this.speechToTextProvider.transcribe({ audio, language: selectedVoice?.locale ?? 'fr-FR' });
    const transcript = rawTranscript instanceof Transcript ? rawTranscript : new Transcript(rawTranscript);
    const command = VoiceCommand.fromTranscript(transcript);

    if (command.intent === 'stop') {
      return Object.freeze({ activated: true, session: session.appendTurn({ command }).end(), command, response: null });
    }

    session = session.withStatus('processing');
    const answer = await this.assistant.answer({ question: transcript.text, ...context });
    const confidence = Number(answer?.plan?.confidence ?? answer?.confidence ?? 0);
    const risks = answer?.plan?.warnings ?? answer?.risks ?? [];
    const audioResponse = await this.textToSpeechProvider.synthesize({
      text: answer.answer,
      language: selectedVoice?.locale ?? 'fr-FR',
      voice: selectedVoice
    });
    const response = new VoiceResponse({
      text: answer.answer,
      audio: audioResponse,
      confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0,
      risks,
      metadata: { model: answer.model ?? null, voice: selectedVoice?.id ?? null }
    });
    session = session.appendTurn({ command, response }).withStatus('speaking');
    return Object.freeze({ activated: true, session, command, response });
  }
}
