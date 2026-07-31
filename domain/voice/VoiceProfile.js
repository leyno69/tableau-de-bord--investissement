const ALLOWED_GENDERS = new Set(['female', 'male', 'neutral']);

export class VoiceProfile {
  constructor({ id, label, gender, locale = 'fr-FR', style = 'natural' } = {}) {
    if (typeof id !== 'string' || !id.trim()) throw new TypeError('VoiceProfile.id est requis.');
    if (typeof label !== 'string' || !label.trim()) throw new TypeError('VoiceProfile.label est requis.');
    if (!ALLOWED_GENDERS.has(gender)) throw new TypeError('VoiceProfile.gender doit être female, male ou neutral.');
    if (typeof locale !== 'string' || !locale.trim()) throw new TypeError('VoiceProfile.locale est requis.');
    if (typeof style !== 'string' || !style.trim()) throw new TypeError('VoiceProfile.style est requis.');

    this.id = id.trim();
    this.label = label.trim();
    this.gender = gender;
    this.locale = locale.trim();
    this.style = style.trim();
    Object.freeze(this);
  }
}

export const VOICE_GENDERS = Object.freeze(['female', 'male', 'neutral']);
