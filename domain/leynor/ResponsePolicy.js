const VALUES = Object.freeze({
  tone: ['calm', 'reassuring', 'positive', 'direct'],
  humorLevel: ['disabled', 'light'],
  metaphorLevel: ['disabled', 'light', 'normal'],
  empathyLevel: ['normal', 'high'],
  explanationDepth: ['concise', 'standard', 'detailed'],
  jargonLevel: ['simple', 'technical'],
  disclosureLevel: ['standard', 'required']
});

export class ResponsePolicy {
  constructor({
    tone = 'calm',
    humorLevel = 'light',
    metaphorLevel = 'light',
    empathyLevel = 'normal',
    explanationDepth = 'standard',
    jargonLevel = 'simple',
    riskDisclosure = 'standard',
    uncertaintyDisclosure = 'standard',
    responseStructure = ['introduction', 'facts', 'explanation', 'risks', 'conclusion']
  } = {}) {
    this.tone = ResponsePolicy.#enum(tone, VALUES.tone, 'tone');
    this.humorLevel = ResponsePolicy.#enum(humorLevel, VALUES.humorLevel, 'humorLevel');
    this.metaphorLevel = ResponsePolicy.#enum(metaphorLevel, VALUES.metaphorLevel, 'metaphorLevel');
    this.empathyLevel = ResponsePolicy.#enum(empathyLevel, VALUES.empathyLevel, 'empathyLevel');
    this.explanationDepth = ResponsePolicy.#enum(explanationDepth, VALUES.explanationDepth, 'explanationDepth');
    this.jargonLevel = ResponsePolicy.#enum(jargonLevel, VALUES.jargonLevel, 'jargonLevel');
    this.riskDisclosure = ResponsePolicy.#enum(riskDisclosure, VALUES.disclosureLevel, 'riskDisclosure');
    this.uncertaintyDisclosure = ResponsePolicy.#enum(uncertaintyDisclosure, VALUES.disclosureLevel, 'uncertaintyDisclosure');
    this.responseStructure = Object.freeze(ResponsePolicy.#structure(responseStructure));
    Object.freeze(this);
  }

  toJSON() {
    return Object.freeze({
      tone: this.tone,
      humorLevel: this.humorLevel,
      metaphorLevel: this.metaphorLevel,
      empathyLevel: this.empathyLevel,
      explanationDepth: this.explanationDepth,
      jargonLevel: this.jargonLevel,
      riskDisclosure: this.riskDisclosure,
      uncertaintyDisclosure: this.uncertaintyDisclosure,
      responseStructure: this.responseStructure
    });
  }

  static #enum(value, allowed, field) {
    if (!allowed.includes(value)) throw new RangeError(`${field} est invalide.`);
    return value;
  }

  static #structure(value) {
    if (!Array.isArray(value) || value.length === 0 || value.some(item => typeof item !== 'string' || !item.trim())) {
      throw new TypeError('responseStructure doit être une liste non vide de chaînes.');
    }
    return [...value];
  }
}
