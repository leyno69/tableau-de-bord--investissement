import test from 'node:test';
import assert from 'node:assert/strict';
import { auditEvidencePipeline } from './leynor-lab-evidence-pipeline-audit.js';

const classification = { recordId: 'classification-1', conclusionId: 'conclusion-1', level: 'moderate', blockers: [] };
const decisionView = {
  conclusionId: 'conclusion-1', classificationRecordId: 'classification-1', explanationId: 'explanation-1',
  evidenceLevel: 'moderate', contradictions: ['c1'], limitations: ['l1'], isActionableInvestmentAdvice: false
};
const reportSnapshot = {
  reportId: 'report-1', conclusionId: 'conclusion-1', classificationRecordId: 'classification-1',
  explanationId: 'explanation-1', evidenceLevel: 'moderate', contradictions: ['c1'], limitations: ['l1'],
  disclaimer: 'Ce rapport ne constitue pas une recommandation d’investissement.'
};

test('déclare cohérente une chaîne dont les références et garde-fous concordent', () => {
  const audit = auditEvidencePipeline({ classification, decisionView, reportSnapshot });
  assert.equal(audit.status, 'consistent');
  assert.deepEqual(audit.findings, []);
  assert.ok(Object.isFrozen(audit));
});

test('détecte les références incohérentes et la perte de contradictions', () => {
  const audit = auditEvidencePipeline({
    classification,
    decisionView: { ...decisionView, classificationRecordId: 'other' },
    reportSnapshot: { ...reportSnapshot, contradictions: [] }
  });
  assert.equal(audit.status, 'inconsistent');
  assert.ok(audit.findings.includes('classification-reference-mismatch'));
  assert.ok(audit.findings.includes('contradictions-not-preserved'));
});

test('détecte l’absence des garde-fous de conseil et de rapport', () => {
  const audit = auditEvidencePipeline({
    classification,
    decisionView: { ...decisionView, isActionableInvestmentAdvice: true },
    reportSnapshot: { ...reportSnapshot, disclaimer: 'Information.' }
  });
  assert.ok(audit.findings.includes('investment-advice-guardrail-missing'));
  assert.ok(audit.findings.includes('report-disclaimer-missing'));
});
