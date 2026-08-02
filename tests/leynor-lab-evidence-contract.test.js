import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEvidenceContract } from '../leynor-lab-evidence-contract.js';

function baseInput() {
  return {
    contractId: 'evidence-contract-v1',
    contractVersion: '1.0.0',
    conclusionId: 'goal-probability-stability',
    criteria: [{
      criterionId: 'independent-reproduction',
      method: 'Comparer des campagnes indépendantes sur des jeux de données distincts.',
      acceptanceRule: 'Toutes les campagnes requises doivent être reproductibles et concordantes.',
      observation: 'La conclusion est reproduite sur deux campagnes et un holdout.',
      calibrationReference: 'LEYNOR-EVIDENCE-001',
      independentlyReproduced: true,
      holdoutValidated: true,
      contradictionsReviewed: true,
      status: 'satisfied',
      limitations: ['La conclusion reste conditionnelle aux hypothèses testées.']
    }]
  };
}

test('déclare le contrat éligible lorsque tous les critères sont satisfaits', () => {
  const result = buildEvidenceContract(baseInput());
  assert.equal(result.isEligibleForEvidenceClassification, true);
  assert.deepEqual(result.blockers, []);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.criteria), true);
});

test('bloque une classification lorsque la reproduction ou le holdout manque', () => {
  const input = baseInput();
  input.criteria[0].independentlyReproduced = false;
  input.criteria[0].holdoutValidated = false;
  const result = buildEvidenceContract(input);
  assert.equal(result.isEligibleForEvidenceClassification, false);
  assert.ok(result.blockers.includes('independent-reproduction:not-independently-reproduced'));
  assert.ok(result.blockers.includes('independent-reproduction:missing-holdout-validation'));
});

test('bloque un critère non satisfait ou dont les contradictions ne sont pas examinées', () => {
  const input = baseInput();
  input.criteria[0].status = 'not-evaluated';
  input.criteria[0].contradictionsReviewed = false;
  const result = buildEvidenceContract(input);
  assert.ok(result.blockers.includes('independent-reproduction:status-not-evaluated'));
  assert.ok(result.blockers.includes('independent-reproduction:contradictions-not-reviewed'));
});

test('est déterministe quel que soit l’ordre des critères', () => {
  const input = baseInput();
  input.criteria.push({ ...input.criteria[0], criterionId: 'source-diversity' });
  const reversed = { ...input, criteria: [...input.criteria].reverse() };
  assert.deepEqual(buildEvidenceContract(input), buildEvidenceContract(reversed));
});

test('refuse les doublons et statuts inconnus', () => {
  const duplicate = baseInput();
  duplicate.criteria.push({ ...duplicate.criteria[0] });
  assert.throws(() => buildEvidenceContract(duplicate), /criterionId dupliqué/);

  const unknown = baseInput();
  unknown.criteria[0].status = 'strong';
  assert.throws(() => buildEvidenceContract(unknown), /Statut de critère inconnu/);
});
