import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateMethodologyReleaseApproval } from './leynor-lab-release-approval-gate.js';

const valid = {
  releaseId: 'methodology-1.0.0', manifestStatus: 'candidate', ciStatus: 'success',
  domainTestsStatus: 'success', pipelineAuditStatus: 'passed', activeMethodologyBlockers: 0,
  limitationsDocumented: true, nonAdviceNoticePresent: true
};

test('approuve uniquement une release intégralement validée', () => {
  const result = evaluateMethodologyReleaseApproval(valid);
  assert.equal(result.approved, true);
  assert.equal(result.decision, 'approve');
  assert.deepEqual(result.blockers, []);
});

test('refuse une release avec un contrôle manquant', () => {
  const result = evaluateMethodologyReleaseApproval({ ...valid, ciStatus: 'failure', limitationsDocumented: false });
  assert.equal(result.approved, false);
  assert.deepEqual(result.blockers, ['ci-not-successful', 'limitations-not-documented']);
});
