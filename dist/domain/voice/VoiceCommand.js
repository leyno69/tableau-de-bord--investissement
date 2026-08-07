const ALLOWED_INTENTS = new Set(['ask', 'stop', 'repeat', 'unknown']);

export class VoiceCommand {
  constructor({ transcript, intent = 'ask', payload = {} } = {}) {
    if (!transcript || typeof transcript.text !== 'string') throw new TypeError('Un transcript valide est requis.');
    if (!ALLOWED_INTENTS.has(intent)) throw new RangeError(`Intention vocale non supportée : ${intent}.`);
    this.transcript = transcript;
    this.intent = intent;
    this.payload = Object.freeze({ ...payload });
    Object.freeze(this);
  }

  static fromTranscript(transcript) {
    const normalized = transcript.text.toLocaleLowerCase('fr-FR');
    const intent = /\b(arrête|stop|terminer|quitte)\b/.test(normalized)
      ? 'stop'
      : /\b(répète|redis)\b/.test(normalized)
        ? 'repeat'
        : 'ask';
    return new VoiceCommand({ transcript, intent });
  }
}
