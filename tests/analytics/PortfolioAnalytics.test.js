import test from 'node:test';
import assert from 'node:assert/strict';

import { AnalyzePortfolioSeries } from '../../application/use-cases/AnalyzePortfolioSeries.js';
import { PortfolioSnapshot } from '../../domain/analytics/PortfolioSnapshot.js';
import { Money } from '../../domain/money/Money.js';

function snapshot(amount, capturedAt, options = {}) {
  return new PortfolioSnapshot({
    portfolioId: options.portfolioId ?? 'portfolio-1',
    totalValue: new Money(amount, options.currency ?? 'EUR'),
    capturedAt,
    source: options.source ?? 'TEST'
  });
}

test('crée un snapshot immuable et normalisé', () => {
  const item = snapshot(100, '2026-01-01');

  assert.equal(item.capturedAt, '2026-01-01T00:00:00.000Z');
  assert.equal(item.source, 'TEST');
  assert.equal(Object.isFrozen(item), true);
  assert.deepEqual(item.toJSON(), {
    portfolioId: 'portfolio-1',
    totalValue: { amount: 100, currency: 'EUR' },
    capturedAt: '2026-01-01T00:00:00.000Z',
    source: 'TEST'
  });
});

test('calcule variations, volatilité et drawdown', () => {
  const analytics = new AnalyzePortfolioSeries();
  const result = analytics.execute({
    snapshots: [
      snapshot(100, '2026-01-01'),
      snapshot(120, '2026-01-02'),
      snapshot(90, '2026-01-03'),
      snapshot(108, '2026-01-04')
    ],
    periodsPerYear: 252
  });

  assert.equal(result.portfolioId, 'portfolio-1');
  assert.equal(result.currency, 'EUR');
  assert.deepEqual(result.absoluteChange.toJSON(), { amount: 8, currency: 'EUR' });
  assert.equal(result.cumulativeReturn, 0.08000000000000007);
  assert.deepEqual(result.returns.map(entry => entry.rate), [0.2, -0.25, 0.2]);
  assert.ok(Math.abs(result.averagePeriodicReturn - 0.05) < 1e-12);
  assert.ok(Math.abs(result.periodicVolatility - 0.2598076211353316) < 1e-12);
  assert.ok(Math.abs(result.annualizedVolatility - (result.periodicVolatility * Math.sqrt(252))) < 1e-12);
  assert.equal(result.maxDrawdown.rate, -0.25);
  assert.equal(result.maxDrawdown.peakAt, '2026-01-02T00:00:00.000Z');
  assert.equal(result.maxDrawdown.troughAt, '2026-01-03T00:00:00.000Z');
  assert.deepEqual(result.maxDrawdown.loss.toJSON(), { amount: -30, currency: 'EUR' });
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.returns), true);
});

test('trie les snapshots et gère les séries insuffisantes', () => {
  const analytics = new AnalyzePortfolioSeries();
  const single = analytics.execute({
    snapshots: [snapshot(100, '2026-01-02')]
  });

  assert.equal(single.cumulativeReturn, 0);
  assert.equal(single.averagePeriodicReturn, null);
  assert.equal(single.periodicVolatility, null);
  assert.equal(single.annualizedVolatility, null);
  assert.equal(single.maxDrawdown.rate, 0);

  const empty = analytics.execute({ snapshots: [] });
  assert.equal(empty.portfolioId, null);
  assert.equal(empty.startValue, null);
  assert.deepEqual(empty.returns, []);
});

test('retourne un rendement nul lorsque la base précédente vaut zéro', () => {
  const result = new AnalyzePortfolioSeries().execute({
    snapshots: [
      snapshot(0, '2026-01-01'),
      snapshot(10, '2026-01-02')
    ]
  });

  assert.equal(result.returns[0].rate, null);
  assert.equal(result.cumulativeReturn, null);
  assert.equal(result.averagePeriodicReturn, null);
});

test('refuse les séries incohérentes et les paramètres invalides', () => {
  const analytics = new AnalyzePortfolioSeries();

  assert.throws(
    () => analytics.execute({ snapshots: {} }),
    /snapshots doit être un tableau/
  );

  assert.throws(
    () => analytics.execute({ snapshots: [{}] }),
    /instance de PortfolioSnapshot/
  );

  assert.throws(
    () => analytics.execute({
      snapshots: [
        snapshot(100, '2026-01-01'),
        snapshot(110, '2026-01-02', { portfolioId: 'portfolio-2' })
      ]
    }),
    /plusieurs portefeuilles/
  );

  assert.throws(
    () => analytics.execute({
      snapshots: [
        snapshot(100, '2026-01-01'),
        snapshot(110, '2026-01-02', { currency: 'USD' })
      ]
    }),
    /plusieurs devises/
  );

  assert.throws(
    () => analytics.execute({
      snapshots: [
        snapshot(100, '2026-01-01T10:00:00Z'),
        snapshot(110, '2026-01-01T10:00:00Z')
      ]
    }),
    /même horodatage/
  );

  assert.throws(
    () => analytics.execute({ snapshots: [], periodsPerYear: 0 }),
    /strictement positif/
  );

  assert.throws(
    () => new PortfolioSnapshot({
      portfolioId: 'portfolio-1',
      totalValue: new Money(-1, 'EUR'),
      capturedAt: '2026-01-01'
    }),
    /négatif/
  );
});
