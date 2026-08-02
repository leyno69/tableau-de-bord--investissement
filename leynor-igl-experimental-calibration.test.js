import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLinearCandidate,
  evaluateCalibrationModel,
  rankCalibrationModels,
} from './leynor-igl-experimental-calibration.js';

const rows = [
  { features: { resilience: 1, diversification: 0 }, outcome: 2 },
  { features: { resilience: 0, diversification: 1 }, outcome: 1 },
  { features: { resilience: 1, diversification: 1 }, outcome: 3 },
];

test('évalue un modèle sur un jeu de validation tenu à l’écart', () => {
  const model = createLinearCandidate('exact', { resilience: 2, diversification: 1 });
  const result = evaluateCalibrationModel(model, rows);
  assert.equal(result.rmse, 0);
  assert.equal(result.mae, 0);
  assert.equal(result.explainedVariance, 1);
});

test('classe les modèles selon leur erreur hors échantillon', () => {
  const exact = createLinearCandidate('exact', { resilience: 2, diversification: 1 });
  const weak = createLinearCandidate('weak', { resilience: 0.5, diversification: 0.5 });
  const ranking = rankCalibrationModels([weak, exact], rows, {
    maximumRmse: 0.5,
    minimumExplainedVariance: 0.8,
  });
  assert.equal(ranking.ranked[0].modelId, 'exact');
  assert.equal(ranking.selectedModelId, 'exact');
  assert.match(ranking.notice, /experimental only/i);
});

test('ne sélectionne aucun modèle qui échoue aux seuils', () => {
  const weak = createLinearCandidate('weak', { resilience: 0, diversification: 0 });
  const ranking = rankCalibrationModels([weak], rows, {
    maximumRmse: 0.1,
    minimumExplainedVariance: 0.9,
  });
  assert.equal(ranking.selectedModelId, null);
  assert.equal(ranking.ranked[0].eligible, false);
});

test('utilise zéro pour une caractéristique absente sans inventer une observation', () => {
  const model = createLinearCandidate('sparse', { resilience: 2, diversification: 1 }, 1);
  assert.equal(model.predict({ resilience: 1 }), 3);
});

test('rejette les valeurs non finies', () => {
  const model = createLinearCandidate('bad-data-check', { resilience: 1 });
  assert.throws(
    () => evaluateCalibrationModel(model, [{ features: { resilience: 1 }, outcome: Number.NaN }]),
    /finite/,
  );
});
