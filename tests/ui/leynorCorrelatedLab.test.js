import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCorrelatedSimulationDefinition,
  normalizeCorrelationMatrix,
  runCorrelatedMassSimulation
} from '../../leynor-correlated-lab.js';

const allocation = [
  { id: 'world', label: 'ETF Monde', weight: 0.8, annualReturn: 0.07, annualVolatility: 0.16 },
  { id: 'bonds', label: 'Obligations', weight: 0.2, annualReturn: 0.03, annualVolatility: 0.06 }
];

const correlationMatrix = [
  [1, 0.2],
  [0.2, 1]
];

const input = {
  portfolioCount: 250,
  years: 15,
  initialAmount: 5000,
  monthlyContribution: 150,
  annualInflation: 0.02,
  annualFees: 0.003,
  goal: 80000,
  seed: 12345,
  allocation,
  correlationMatrix
};

test('normalise une matrice symétrique et immuable', () => {
  const matrix = normalizeCorrelationMatrix(correlationMatrix, 2);
  assert.deepEqual(matrix, correlationMatrix);
  assert.ok(Object.isFrozen(matrix));
  assert.ok(Object.isFrozen(matrix[0]));
});

test('refuse les dimensions, diagonales et symétries invalides', () => {
  assert.throws(() => normalizeCorrelationMatrix([[1]], 2), /2 lignes/);
  assert.throws(() => normalizeCorrelationMatrix([[0.9, 0], [0, 1]], 2), /diagonale/);
  assert.throws(() => normalizeCorrelationMatrix([[1, 0.4], [0.2, 1]], 2), /symétrique/);
});

test('refuse une matrice non positive semi-définie', () => {
  assert.throws(() => normalizeCorrelationMatrix([
    [1, 0.9, 0.9],
    [0.9, 1, -0.9],
    [0.9, -0.9, 1]
  ], 3), /positive semi-définie/);
});

test('la définition corrélée est validée et immuable', () => {
  const definition = createCorrelatedSimulationDefinition(input);
  assert.equal(definition.correlationMatrix[0][1], 0.2);
  assert.ok(Object.isFrozen(definition));
  assert.ok(Object.isFrozen(definition.correlationMatrix));
});

test('une même graine et une même matrice reproduisent exactement le rapport', () => {
  assert.deepEqual(runCorrelatedMassSimulation(input), runCorrelatedMassSimulation(input));
});

test('la matrice de corrélation influence réellement les résultats simulés', () => {
  const independent = runCorrelatedMassSimulation({
    ...input,
    correlationMatrix: [[1, 0], [0, 1]]
  });
  const stronglyCorrelated = runCorrelatedMassSimulation({
    ...input,
    correlationMatrix: [[1, 0.95], [0.95, 1]]
  });
  assert.notEqual(independent.summary.nominal.median, stronglyCorrelated.summary.nominal.median);
  assert.notEqual(independent.summary.drawdown.p95, stronglyCorrelated.summary.drawdown.p95);
});

test('le rapport expose la méthodologie et la limite de modèle', () => {
  const report = runCorrelatedMassSimulation(input);
  assert.match(report.methodology.model, /corrélé/);
  assert.match(report.methodology.correlationStatement, /matrice de corrélation validée/);
  assert.match(report.methodology.interpretationWarning, /ne prédit pas/);
  assert.ok(report.summary.goalProbability >= 0 && report.summary.goalProbability <= 1);
});
