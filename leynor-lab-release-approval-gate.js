function text(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`);
  return value.trim();
}

export function evaluateMethodologyReleaseApproval(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input doit être un objet.');
  const blockers = [];
  if (input.manifestStatus !== 'candidate') blockers.push('manifest-not-candidate');
  if (input.ciStatus !== 'success') blockers.push('ci-not-successful');
  if (input.domainTestsStatus !== 'success') blockers.push('domain-tests-not-successful');
  if (input.pipelineAuditStatus !== 'passed') blockers.push('pipeline-audit-not-passed');
  if (input.activeMethodologyBlockers > 0) blockers.push('active-methodology-blockers');
  if (input.limitationsDocumented !== true) blockers.push('limitations-not-documented');
  if (input.nonAdviceNoticePresent !== true) blockers.push('non-advice-notice-missing');
  return Object.freeze({
    schemaVersion: 1,
    releaseId: text(input.releaseId, 'releaseId'),
    approved: blockers.length === 0,
    blockers: Object.freeze(blockers.sort()),
    decision: blockers.length === 0 ? 'approve' : 'reject'
  });
}
