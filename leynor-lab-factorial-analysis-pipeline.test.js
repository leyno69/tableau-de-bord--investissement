import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeFactorialResult,
  groupReplicationsByCell,
} from './leynor-lab-factorial-analysis-pipeline.js';
import { runFactorialSensitivity } from './leynor-lab-factorial-sensitivity-engine.js';

const config = Object.freeze({
  campaignId: 'factorial-analysis-test',
  behaviors: ['regular', 'interruption'],
  reserveMonths: [0, 6],
  lineCounts: [5, 15],
  assetVolatilities: [0.12, 0.2],
  correlations: [0.1, 0.35, 0.75],
  shockIntensities: [0, 1800, 3600, 7200],
  horizons: [10, 20, 30],
  seeds: [101, 202, 303, 404, 505],
  pathsPerReplication: 2,
  assumptions: {
    initialCapital: 10000,
    monthlyContribution: 300,
    annualGeometricReturn: 0.05,
  },
  limitations: ['synthetic'],
});

test('regroupe exactement cinq graines par cellule factorielle', () => {
  const result = runFactorialSensitivity(config);
  const groups = groupReplicationsByCell(result.replications);

  assert.equal(result.replications.length, 2880);
  assert.equal(groups.size, 576);
  assert.ok([...groups.values()].every((rows) => rows.length === 5));
});

test('produit un classement reproductible des interactions et de la stabilité', () => {
  const first = analyzeFactorialResult(runFactorialSensitivity(config));
  const second = analyzeFactorialResult(runFactorialSensitivity(config));

  assert.deepEqual(first, second);
  assert.equal(first.replicationCount, 2880);
  assert.equal(first.totalPaths, 5760);
  assert.equal(first.cellCount, 576);
  assert.equal(first.interactions.length, 6);
  assert.equal(first.stability.length, 576);
  assert.match(first.notice, /not a forecast/i);
});

test('ne recommande aucune graine supplémentaire pour une cellule stable', () => {
  const rows = [100, 101, 99, 100.5, 100.2].map((finalMedian, index) => ({
    behavior: 'regular', reserveMonths: 0, lineCount: 5,
    assetVolatility: 0.12, correlation: 0.1, shockIntensity: 0,
    years: 10, seed: index + 1, finalMedian,
  }));

  const interactionsFixture = [];
  for (const behavior of ['regular', 'interruption'])
    for (const reserveMonths of [0, 6])
      for (const lineCount of [5, 15])
        for (const assetVolatility of [0.12, 0.2])
          for (const correlation of [0.1, 0.75])
            for (const shockIntensity of [0, 7200])
              for (const years of [10, 30])
                interactionsFixture.push({
                  behavior, reserveMonths, lineCount, assetVolatility,
                  correlation, shockIntensity, years, seed: 1,
                  finalMedian: 100 + reserveMonths - shockIntensity / 1000,
                });

  const result = analyzeFactorialResult({
    campaignId: 'stable-fixture',
    totalPaths: rows.length + interactionsFixture.length,
    replications: [...rows, ...interactionsFixture],
  });

  const target = result.stability.find((item) => item.cellKey.includes('behavior=regular|reserveMonths=0|lineCount=5|assetVolatility=0.12|correlation=0.1|shockIntensity=0|years=10'));
  assert.equal(target.stability, 'stable');
  assert.equal(target.additionalSeeds, 0);
});
