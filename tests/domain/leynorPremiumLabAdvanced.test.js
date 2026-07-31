import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCorrelationMatrix, cholesky, normalizeRegimePlan, regimeAtMonth } from '../../leynor-lab-regimes.js';
import { buildExhaustiveLeynorReport, createAdvancedLabDefinition, runAdvancedLabSimulation, runAdvancedLabSimulationBatched } from '../../leynor-premium-lab-advanced.js';

const allocation = [
  { id: 'world', label: 'ETF Monde', weight: .8, annualReturn: .07, annualVolatility: .16 },
  { id: 'bonds', label: 'Obligations', weight: .1, annualReturn: .03, annualVolatility: .06 },
  { id: 'gold', label: 'Or', weight: .05, annualReturn: .035, annualVolatility: .14 },
  { id: 'ai', label: 'IA', weight: .05, annualReturn: .09, annualVolatility: .28 }
];

const input = { portfolioCount: 300, years: 10, initialAmount: 3000, monthlyContribution: 100, goal: 30000, seed: 69, commonCorrelation: .35, allocation };

test('les régimes sont validés et sélectionnés par mois', () => {
  const plan = normalizeRegimePlan([{ regime: 'croissance', months: 12 }, { regime: 'crise', months: Infinity }]);
  assert.equal(regimeAtMonth(plan, 0).label, 'Croissance');
  assert.equal(regimeAtMonth(plan, 12).label, 'Crise');
  assert.throws(() => normalizeRegimePlan([{ regime: 'inconnu', months: 1 }]), /inconnu/);
});

test('la matrice de corrélation produit une décomposition de Cholesky', () => {
  const matrix = buildCorrelationMatrix(4, .35);
  const lower = cholesky(matrix);
  assert.equal(lower.length, 4);
  assert.ok(lower[0][0] > 0);
  assert.ok(Object.isFrozen(lower));
});

test('le moteur avancé est reproductible et expose des percentiles complets', () => {
  const first = runAdvancedLabSimulation(input);
  const second = runAdvancedLabSimulation(input);
  assert.deepEqual(first.summary.nominal, second.summary.nominal);
  assert.ok(first.summary.nominal.p01 <= first.summary.nominal.p05);
  assert.ok(first.summary.nominal.p95 <= first.summary.nominal.p99);
  assert.ok(first.summary.drawdown.p95 >= first.summary.drawdown.median);
});

test('le moteur par lots restitue le même résultat et publie la progression', async () => {
  const progress = [];
  const direct = runAdvancedLabSimulation(input);
  const batched = await runAdvancedLabSimulationBatched(input, { batchSize: 37, onProgress: item => progress.push(item.completed) });
  assert.deepEqual(batched.summary.nominal, direct.summary.nominal);
  assert.equal(progress.at(-1), input.portfolioCount);
});

test('le rapport LEYNOR expose verdict risques hypothèses et limites', () => {
  const report = runAdvancedLabSimulation(createAdvancedLabDefinition(input));
  const interpretation = buildExhaustiveLeynorReport(report);
  assert.match(interpretation.title, /exhaustif/i);
  assert.ok(interpretation.executiveSummary.length >= 4);
  assert.ok(interpretation.risk.severeDrawdown >= interpretation.risk.medianDrawdown);
  assert.equal(interpretation.assumptions.seed, 69);
  assert.ok(interpretation.limitations.length >= 3);
  assert.ok(Object.isFrozen(interpretation));
});
