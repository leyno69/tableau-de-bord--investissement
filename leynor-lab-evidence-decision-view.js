function text(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`);
  return value.trim();
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

export function buildEvidenceDecisionView({ classification, explanation }) {
  if (!classification || typeof classification !== 'object') throw new TypeError('classification doit être un objet.');
  if (!explanation || typeof explanation !== 'object') throw new TypeError('explanation doit être un objet.');
  const conclusionId = text(classification.conclusionId, 'classification.conclusionId');
  if (text(explanation.conclusionId, 'explanation.conclusionId') !== conclusionId) throw new Error('La classification et l’explication doivent viser la même conclusion.');
  const level = text(classification.level, 'classification.level');
  const blockers = Object.freeze([...(classification.blockers ?? [])].map((v, i) => text(v, `classification.blockers[${i}]`)).sort());
  const risks = Object.freeze([...(explanation.risks ?? [])].map((v, i) => text(v, `explanation.risks[${i}]`)));
  const contradictions = Object.freeze([...(explanation.contradictions ?? [])].map((v, i) => text(v, `explanation.contradictions[${i}]`)));
  const limitations = Object.freeze([...(explanation.limitations ?? []), ...(classification.limitations ?? [])]
    .map((v, i) => text(v, `limitations[${i}]`)));
  return freeze({
    schemaVersion: 1,
    conclusionId,
    evidenceLevel: level,
    classificationRecordId: text(classification.recordId, 'classification.recordId'),
    explanationId: text(explanation.explanationId, 'explanation.explanationId'),
    summary: text(explanation.summary, 'explanation.summary'),
    rationale: text(classification.rationale, 'classification.rationale'),
    evidenceReferences: Object.freeze([...(explanation.evidenceReferences ?? [])].map((v, i) => text(v, `evidenceReferences[${i}]`)).sort()),
    blockers,
    contradictions,
    risks,
    limitations,
    decisionMessage: level === 'unclassified'
      ? 'Les éléments disponibles ne permettent pas de classer le niveau de preuve.'
      : 'Ce niveau de preuve décrit la solidité des éléments disponibles ; il ne recommande aucune décision d’investissement.',
    isActionableInvestmentAdvice: false
  });
}
