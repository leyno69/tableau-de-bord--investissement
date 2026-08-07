export class VoiceResponse {
  constructor({ text, audio = null, confidence = 0, risks = [], metadata = {} } = {}) {
    if (typeof text !== 'string' || !text.trim()) throw new TypeError('Le texte de la réponse vocale est requis.');
    const normalizedConfidence = Number(confidence);
    if (!Number.isFinite(normalizedConfidence) || normalizedConfidence < 0 || normalizedConfidence > 1) {
      throw new RangeError('La confiance de la réponse doit être comprise entre 0 et 1.');
    }
    this.text = text.trim();
    this.audio = audio;
    this.confidence = normalizedConfidence;
    this.risks = Object.freeze([...risks]);
    this.metadata = Object.freeze({ ...metadata });
    Object.freeze(this);
  }
}
