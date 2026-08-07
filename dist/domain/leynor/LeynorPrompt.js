export class LeynorPrompt {
  constructor({ system, user, metadata = {} }) {
    this.system = LeynorPrompt.#requiredText(system, 'system');
    this.user = LeynorPrompt.#requiredText(user, 'user');
    this.metadata = Object.freeze(LeynorPrompt.#cloneObject(metadata, 'metadata'));
    Object.freeze(this);
  }

  toMessages() {
    return Object.freeze([
      Object.freeze({ role: 'system', content: this.system }),
      Object.freeze({ role: 'user', content: this.user })
    ]);
  }

  toJSON() {
    return Object.freeze({ system: this.system, user: this.user, metadata: this.metadata });
  }

  static #requiredText(value, field) {
    if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${field} doit être une chaîne non vide.`);
    return value.trim();
  }

  static #cloneObject(value, field) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${field} doit être un objet.`);
    return JSON.parse(JSON.stringify(value));
  }
}
