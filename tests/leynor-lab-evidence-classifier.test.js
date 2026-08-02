import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyEvidenceLevel } from '../leynor-lab-evidence-classifier.js';

const crossValidation = {
  blockers: [],
  evaluations: [
    { criterionId: 'independent-reproduction', status: 'concordant' },
    { criterionId: 'holdout-validation', status: 'concordant' }
  ]
};

const rules = [{
  ruleId: 'evidence-level-calibrated-v1',
  level: 'supported',
  calibrationReference: 'evidence-calibration-2026-08',
  method: 'Correspondance exacte avec une règle issue de campagnes indépendantes.',
  requiredStatuses: {
    'independent-reproduction': 'concordant',
    'holdout-validation': 'concordant'
  },
  limitations: ['La classification reste limitée au protocole calibré.']
}];

test('classe uniquement avec une règle calibrée applicable', () => {
  const result = classifyEvidenceLevel({
    conclusionId: 'conclusion-1', crossValidation, rules, classifierVersion: '1.0.0'
  });
  assert.equal(result.level, 'supported');
  assert.equal(result.isClassified, true);
  assert.equal(result.ruleId, 'evidence-level-calibrated-v1');
  assert.equal(Object.isFrozen(result), true);
});

test('reste non classé lorsqu’aucune règle ne correspond', () => {
  const result = classifyEvidenceLevel({
    conclusionId: 'conclusion-1',
    crossValidation: { blockers: [], evaluations: [{ criterionId: 'independent-reproduction', status: 'incomplete' }] },
    rules,
    classifierVersion: '1.0.0'
  });
  assert.equal(result.level, 'unclassified');
  assert.equal(result.isClassified, false);
  assert.ok(result.blockers.includes('no-calibrated-rule-matched'));
});

test('refuse de classifier en présence de blocages méthodologiques', () => {
  const result = classifyEvidenceLevel({
    conclusionId: 'conclusion-1',
    crossValidation: { ...crossValidation, blockers: ['contradictory-calibrations'] },
    rules,
    classifierVersion: '1.0.0'
  });
  assert.equal(result.level, 'unclassified');
  assert.ok(result.blockers.includes('contradictory-calibrations'));
});

test('bloque les règles calibrées ambiguës', () => {
  const duplicateMatch = { ...rules[0], ruleId: 'evidence-level-calibrated-v2', level: 'strongly-supported' };
  const result = classifyEvidenceLevel({
    conclusionId: 'conclusion-1', crossValidation, rules: [...rules, duplicateMatch], classifierVersion: '1.0.0'
  });
  assert.equal(result.level, 'unclassified');
  assert.ok(result.blockers.includes('ambiguous-calibrated-rules'));
});

test('refuse les règles dupliquées', () => {
  assert.throws(() => classifyEvidenceLevel({
    conclusionId: 'conclusion-1', crossValidation, rules: [...rules, rules[0]], classifierVersion: '1.0.0'
  }), /ruleId dupliqué/);
});
