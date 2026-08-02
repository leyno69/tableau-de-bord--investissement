function text(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`);
  return value.trim();
}

function list(value, field) {
  if (!Array.isArray(value)) throw new TypeError(`${field} doit être un tableau.`);
  return Object.freeze(value.map((item, index) => text(item, `${field}[${index}]`)));
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

export function buildEvidenceReportSnapshot({ reportId, generatedAt, methodologyVersion, decisionView }) {
  if (!decisionView || typeof decisionView !== 'object') throw new TypeError('decisionView doit être un objet.');
  return freeze({
    schemaVersion: 1,
    reportId: text(reportId, 'reportId'),
    generatedAt: text(generatedAt, 'generatedAt'),
    methodologyVersion: text(methodologyVersion, 'methodologyVersion'),
    conclusionId: text(decisionView.conclusionId, 'decisionView.conclusionId'),
    evidenceLevel: text(decisionView.evidenceLevel, 'decisionView.evidenceLevel'),
    summary: text(decisionView.summary, 'decisionView.summary'),
    rationale: text(decisionView.rationale, 'decisionView.rationale'),
    evidenceReferences: list(decisionView.evidenceReferences ?? [], 'decisionView.evidenceReferences'),
    blockers: list(decisionView.blockers ?? [], 'decisionView.blockers'),
    contradictions: list(decisionView.contradictions ?? [], 'decisionView.contradictions'),
    risks: list(decisionView.risks ?? [], 'decisionView.risks'),
    limitations: list(decisionView.limitations ?? [], 'decisionView.limitations'),
    decisionMessage: text(decisionView.decisionMessage, 'decisionView.decisionMessage'),
    classificationRecordId: text(decisionView.classificationRecordId, 'decisionView.classificationRecordId'),
    explanationId: text(decisionView.explanationId, 'decisionView.explanationId'),
    disclaimer: 'Ce rapport décrit les éléments disponibles et leurs limites. Il ne constitue pas une recommandation d’investissement.'
  });
}
