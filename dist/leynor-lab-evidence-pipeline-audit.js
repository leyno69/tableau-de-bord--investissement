function text(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`);
  return value.trim();
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

export function auditEvidencePipeline({ classification, decisionView, reportSnapshot }) {
  if (!classification || !decisionView || !reportSnapshot) throw new TypeError('classification, decisionView et reportSnapshot sont obligatoires.');
  const findings = [];
  const conclusionId = text(classification.conclusionId, 'classification.conclusionId');
  if (decisionView.conclusionId !== conclusionId) findings.push('decision-view-conclusion-mismatch');
  if (reportSnapshot.conclusionId !== conclusionId) findings.push('report-conclusion-mismatch');
  if (decisionView.classificationRecordId !== classification.recordId) findings.push('classification-reference-mismatch');
  if (reportSnapshot.classificationRecordId !== classification.recordId) findings.push('report-classification-reference-mismatch');
  if (reportSnapshot.explanationId !== decisionView.explanationId) findings.push('explanation-reference-mismatch');
  if (reportSnapshot.evidenceLevel !== classification.level) findings.push('evidence-level-mismatch');
  if (classification.level !== 'unclassified' && (classification.blockers ?? []).length > 0) findings.push('classified-with-active-blockers');
  if (decisionView.isActionableInvestmentAdvice !== false) findings.push('investment-advice-guardrail-missing');
  if (!String(reportSnapshot.disclaimer ?? '').includes('ne constitue pas une recommandation')) findings.push('report-disclaimer-missing');
  if ((decisionView.contradictions ?? []).length !== (reportSnapshot.contradictions ?? []).length) findings.push('contradictions-not-preserved');
  if ((decisionView.limitations ?? []).length !== (reportSnapshot.limitations ?? []).length) findings.push('limitations-not-preserved');

  return freeze({
    schemaVersion: 1,
    conclusionId,
    classificationRecordId: text(classification.recordId, 'classification.recordId'),
    reportId: text(reportSnapshot.reportId, 'reportSnapshot.reportId'),
    findings: Object.freeze(findings.sort()),
    status: findings.length === 0 ? 'consistent' : 'inconsistent',
    checkedGuardrails: Object.freeze([
      'reference-integrity', 'blocker-integrity', 'contradiction-preservation',
      'limitation-preservation', 'no-investment-advice', 'report-disclaimer'
    ]),
    limitations: Object.freeze([
      'Cet audit vérifie la cohérence structurelle, pas la validité scientifique des preuves.',
      'Un statut consistent ne démontre ni causalité ni généralisation.'
    ])
  });
}
