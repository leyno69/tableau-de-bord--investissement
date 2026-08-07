export class LeynorResponsePlan {
  constructor({
    question,
    policy,
    principles,
    context,
    instructions,
    evidence = [],
    warnings = []
  }) {
    this.question = LeynorResponsePlan.#requiredText(question, 'question');
    this.policy = LeynorResponsePlan.#object(policy, 'policy');
    this.principles = Object.freeze(LeynorResponsePlan.#textList(principles, 'principles'));
    this.context = Object.freeze({ ...LeynorResponsePlan.#object(context, 'context') });
    this.instructions = Object.freeze(LeynorResponsePlan.#textList(instructions, 'instructions'));
    this.evidence = Object.freeze(LeynorResponsePlan.#textList(evidence, 'evidence', true));
    this.warnings = Object.freeze(LeynorResponsePlan.#textList(warnings, 'warnings', true));
    Object.freeze(this);
  }

  toJSON() {
    return Object.freeze({
      question: this.question,
      policy: this.policy,
      principles: this.principles,
      context: this.context,
      instructions: this.instructions,
      evidence: this.evidence,
      warnings: this.warnings
    });
  }

  static #requiredText(value, field) {
    if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${field} doit être une chaîne non vide.`);
    return value.trim();
  }

  static #object(value, field) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${field} doit être un objet.`);
    return value;
  }

  static #textList(value, field, allowEmpty = false) {
    if (!Array.isArray(value) || (!allowEmpty && value.length === 0) || value.some(item => typeof item !== 'string' || !item.trim())) {
      throw new TypeError(`${field} doit être une liste${allowEmpty ? '' : ' non vide'} de chaînes.`);
    }
    return value.map(item => item.trim());
  }
}
