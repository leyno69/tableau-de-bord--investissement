function normalizeText(value) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError('Le texte du transcript est requis.');
  return value.trim().replace(/\s+/g, ' ');
}

export class Transcript {
  constructor({ text, language = 'fr-FR', confidence = 1, capturedAt = new Date().toISOString() } = {}) {
    const normalizedConfidence = Number(confidence);
    if (!Number.isFinite(normalizedConfidence) || normalizedConfidence < 0 || normalizedConfidence > 1) {
      throw new RangeError('La confiance du transcript doit être comprise entre 0 et 1.');
    }
    this.text = normalizeText(text);
    this.language = normalizeText(language);
    this.confidence = normalizedConfidence;
    this.capturedAt = new Date(capturedAt).toISOString();
    Object.freeze(this);
  }
}
