import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEvidenceReportSnapshot } from './leynor-lab-evidence-report-snapshot.js';

const decisionView = {
  conclusionId: 'conclusion-1', evidenceLevel: 'moderate', summary: 'Synthèse.',
  rationale: 'Règle calibrée appliquée.', evidenceReferences: ['evidence-1'], blockers: [],
  contradictions: ['Signal contradictoire.'], risks: ['Risque de régime.'], limitations: ['Historique limité.'],
  decisionMessage: 'Information uniquement.', classificationRecordId: 'classification-1', explanationId: 'explanation-1'
};

test('construit un instantané immuable et complet', () => {
  const report = buildEvidenceReportSnapshot({ reportId: 'report-1', generatedAt: '2026-08-02T14:00:00Z', methodologyVersion: '1.0.0', decisionView });
  assert.equal(report.evidenceLevel, 'moderate');
  assert.equal(report.classificationRecordId, 'classification-1');
  assert.match(report.disclaimer, /ne constitue pas/);
  assert.ok(Object.isFrozen(report));
});

test('conserve les contradictions et limites', () => {
  const report = buildEvidenceReportSnapshot({ reportId: 'report-1', generatedAt: '2026-08-02T14:00:00Z', methodologyVersion: '1.0.0', decisionView });
  assert.deepEqual(report.contradictions, ['Signal contradictoire.']);
  assert.deepEqual(report.limitations, ['Historique limité.']);
});

test('refuse un rapport sans vue décisionnelle', () => {
  assert.throws(() => buildEvidenceReportSnapshot({ reportId: 'x', generatedAt: 'x', methodologyVersion: 'x' }), /decisionView/);
});
