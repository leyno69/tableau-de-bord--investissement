import { LeynorPrompt } from '../../domain/leynor/LeynorPrompt.js';

export class LeynorPromptBuilder {
  build(plan) {
    const source = LeynorPromptBuilder.#plan(plan);
    const system = [
      'Tu es LEYNOR, un compagnon d’investissement spécialisé.',
      '',
      'MISSION',
      'Aider l’utilisateur à comprendre son patrimoine et à prendre de meilleures décisions, sans jamais décider à sa place.',
      '',
      'PRINCIPES IMMUABLES',
      ...source.principles.map(item => `- ${item}`),
      '',
      'POLITIQUE DE RÉPONSE',
      ...LeynorPromptBuilder.#policyLines(source.policy),
      '',
      'INSTRUCTIONS DE STYLE',
      ...source.instructions.map(item => `- ${item}`),
      '',
      'RÈGLES DE FIABILITÉ',
      '- N’invente aucune donnée, source, actualité ou causalité.',
      '- Appuie chaque affirmation factuelle sur les éléments fournis.',
      '- Distingue explicitement faits, hypothèses et incertitudes.',
      '- Une métaphore ne constitue jamais une preuve.',
      '- Ne formule aucune promesse de gain et ne crée jamais de FOMO.',
      '- Lorsque les preuves sont insuffisantes, dis-le clairement.',
      '',
      'FORMAT ATTENDU',
      `Respecte cet ordre : ${source.policy.responseStructure.join(' → ')}.`
    ].join('\n');

    const user = [
      'QUESTION UTILISATEUR',
      source.question,
      '',
      'CONTEXTE STRUCTURÉ',
      LeynorPromptBuilder.#stableJson(source.context),
      '',
      'ÉLÉMENTS DE PREUVE',
      source.evidence.length ? source.evidence.map(item => `- ${item}`).join('\n') : '- Aucun élément de preuve fourni.',
      '',
      'AVERTISSEMENTS OBLIGATOIRES',
      source.warnings.length ? source.warnings.map(item => `- ${item}`).join('\n') : '- Aucun avertissement supplémentaire.',
      '',
      'TÂCHE',
      'Rédige la réponse finale en français, fidèle à LEYNOR et limitée aux informations disponibles.'
    ].join('\n');

    return new LeynorPrompt({
      system,
      user,
      metadata: {
        schemaVersion: '1.0',
        providerAgnostic: true,
        evidenceCount: source.evidence.length,
        warningCount: source.warnings.length,
        policy: source.policy
      }
    });
  }

  static #plan(value) {
    const source = value?.toJSON instanceof Function ? value.toJSON() : value;
    if (!source || typeof source !== 'object' || Array.isArray(source)) throw new TypeError('plan doit être un plan de réponse valide.');
    for (const field of ['question', 'policy', 'principles', 'context', 'instructions', 'evidence', 'warnings']) {
      if (!(field in source)) throw new TypeError(`plan.${field} est requis.`);
    }
    return source;
  }

  static #policyLines(policy) {
    if (!policy || typeof policy !== 'object' || Array.isArray(policy)) throw new TypeError('plan.policy doit être un objet.');
    return [
      `- Ton : ${policy.tone}.`,
      `- Humour : ${policy.humorLevel}.`,
      `- Métaphores : ${policy.metaphorLevel}.`,
      `- Empathie : ${policy.empathyLevel}.`,
      `- Profondeur : ${policy.explanationDepth}.`,
      `- Jargon : ${policy.jargonLevel}.`,
      `- Divulgation des risques : ${policy.riskDisclosure}.`,
      `- Divulgation des incertitudes : ${policy.uncertaintyDisclosure}.`
    ];
  }

  static #stableJson(value) {
    return JSON.stringify(LeynorPromptBuilder.#sort(value), null, 2);
  }

  static #sort(value) {
    if (Array.isArray(value)) return value.map(item => LeynorPromptBuilder.#sort(item));
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, LeynorPromptBuilder.#sort(value[key])]));
  }
}
