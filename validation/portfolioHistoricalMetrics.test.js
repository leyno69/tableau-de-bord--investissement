import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateHistoricalMetrics, calculateReplayHistoricalMetrics } from './portfolioHistoricalMetrics.js';
import { runHistoricalReplay } from './portfolioHistoricalReplayEngine.js';

test('un apport n’est jamais confondu avec de la performance', () => {
  const metrics = calculateHistoricalMetrics({
    openingCapital: 100,
    valuePath: [
      { date: '2020-01-02', value: 100, externalFlow: 0 },
      { date: '2020-01-03', value: 200, externalFlow: 100 },
      { date: '2020-01-06', value: 220, externalFlow: 0 }
    ]
  });
  assert.ok(Math.abs(metrics.cumulativeReturn - 0.1) < 1e-12);
  assert.ok(Math.abs(metrics.periodReturns[0]) < 1e-12);
  assert.ok(Math.abs(metrics.periodReturns[1] - 0.1) < 1e-12);
});

test('le drawdown maximal et sa récupération sont mesurés sur l’indice de richesse ajusté', () => {
  const metrics = calculateHistoricalMetrics({
    openingCapital: 100,
    valuePath: [
      { date: '2020-01-02', value: 100 },
      { date: '2020-01-03', value: 80 },
      { date: '2020-01-06', value: 100 }
    ]
  });
  assert.ok(Math.abs(metrics.maxDrawdown + 0.2) < 1e-12);
  assert.equal(metrics.recovery.peakDate, '2020-01-02');
  assert.equal(metrics.recovery.troughDate, '2020-01-03');
  assert.equal(metrics.recovery.recoveryDate, '2020-01-06');
  assert.equal(metrics.recovery.recoveryDaysFromTrough, 3);
  assert.equal(metrics.recovery.underwaterDays, 4);
});

test('un drawdown non récupéré reste explicitement non récupéré', () => {
  const metrics = calculateHistoricalMetrics({
    openingCapital: 100,
    valuePath: [
      { date: '2020-01-02', value: 100 },
      { date: '2020-01-03', value: 70 },
      { date: '2020-01-06', value: 85 }
    ]
  });
  assert.equal(metrics.recovery.recovered, false);
  assert.equal(metrics.recovery.recoveryDate, null);
  assert.equal(metrics.recovery.recoveryDaysFromTrough, null);
});

test('le rendement annualisé utilise la durée calendaire explicitement documentée', () => {
  const metrics = calculateHistoricalMetrics({
    openingCapital: 100,
    valuePath: [
      { date: '2020-01-02', value: 100 },
      { date: '2021-01-01', value: 110 }
    ]
  });
  const expected = Math.pow(1.1, 365.2425 / 365) - 1;
  assert.ok(Math.abs(metrics.annualizedReturn - expected) < 1e-12);
});

test('la volatilité annualisée utilise l’écart-type échantillonnal des rendements de période', () => {
  const metrics = calculateHistoricalMetrics({
    openingCapital: 100,
    valuePath: [
      { date: '2020-01-02', value: 100 },
      { date: '2020-01-03', value: 110 },
      { date: '2020-01-06', value: 99 }
    ]
  });
  const expectedSampleStd = Math.sqrt(((0.1 - 0) ** 2 + (-0.1 - 0) ** 2) / 1);
  assert.ok(Math.abs(metrics.annualizedVolatility - expectedSampleStd * Math.sqrt(252)) < 1e-12);
});

test('les dates non strictement croissantes sont refusées', () => {
  assert.throws(() => calculateHistoricalMetrics({
    openingCapital: 100,
    valuePath: [
      { date: '2020-01-03', value: 100 },
      { date: '2020-01-03', value: 101 }
    ]
  }), /strictement croissantes/);
});

test('les métriques peuvent être calculées directement depuis un replay avec apports', () => {
  const replay = runHistoricalReplay({
    replayId: 'metrics-fixture-v1',
    initialCash: 1000,
    allocation: [{ ticker: 'AAA', weight: 1 }],
    costPolicy: { transactionCostBps: 0 },
    seriesByTicker: {
      AAA: [
        { date: '2020-01-02', price: 100 },
        { date: '2020-01-03', price: 100 },
        { date: '2020-01-06', price: 110 }
      ]
    },
    startDate: '2020-01-02',
    endDate: '2020-01-06',
    contributions: [{ date: '2020-01-03', amount: 100 }]
  });
  const metrics = calculateReplayHistoricalMetrics(replay);
  assert.equal(replay.valuePath[1].externalFlow, 100);
  assert.ok(Math.abs(metrics.cumulativeReturn - 0.1) < 1e-12);
});