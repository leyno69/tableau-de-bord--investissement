import test from 'node:test';
import assert from 'node:assert/strict';

import { BuildPortfolioDashboard } from '../../application/use-cases/BuildPortfolioDashboard.js';
import { Money } from '../../domain/money/Money.js';
import { PortfolioSnapshot } from '../../domain/analytics/PortfolioSnapshot.js';

test('construit une vue consolidée et transmet le même contexte aux moteurs', async () => {
  const valuation = Object.freeze({
    baseCurrency: 'EUR',
    positions: Object.freeze([]),
    cash: Object.freeze([]),
    positionsValue: Money.zero('EUR'),
    cashValue: new Money(100, 'EUR'),
    totalValue: new Money(100, 'EUR')
  });
  const performance = Object.freeze({ totalGain: Money.zero('EUR') });
  const allocation = Object.freeze({ holdings: Object.freeze([]) });
  const analytics = Object.freeze({ maxDrawdown: null });
  const alerts = Object.freeze({ events: Object.freeze([]) });
  const calls = [];

  const dashboard = new BuildPortfolioDashboard({
    valuePortfolio: {
      async execute(input) {
        calls.push(['valuation', input]);
        return valuation;
      }
    },
    calculatePerformance: {
      async execute(input) {
        assert.equal(input, valuation);
        return performance;
      }
    },
    calculateAllocation: {
      async execute(input) {
        assert.equal(input, valuation);
        return allocation;
      }
    },
    analyzeSeries: {
      execute(input) {
        assert.equal(input.snapshots.length, 2);
        assert.equal(input.snapshots[1] instanceof PortfolioSnapshot, true);
        assert.equal(input.periodsPerYear, 252);
        return analytics;
      }
    },
    evaluateAlerts: {
      async execute(input) {
        assert.equal(input.portfolioId, 'portfolio-1');
        assert.equal(input.context.valuation, valuation);
        assert.equal(input.context.performance, performance);
        assert.equal(input.context.allocation, allocation);
        assert.equal(input.context.analytics, analytics);
        assert.deepEqual(input.context.marketQuotes, [{ assetId: 'ETF-WORLD' }]);
        assert.deepEqual(input.existingFingerprints, ['known']);
        return alerts;
      }
    },
    clock: () => new Date('2026-07-30T21:30:00Z')
  });

  const historicalSnapshot = new PortfolioSnapshot({
    portfolioId: 'portfolio-1',
    totalValue: new Money(90, 'EUR'),
    capturedAt: '2026-07-29T21:30:00Z'
  });

  const result = await dashboard.execute({
    portfolioId: ' portfolio-1 ',
    positions: [],
    cashBalances: [],
    baseCurrency: 'eur',
    historicalSnapshots: [historicalSnapshot],
    marketQuotes: [{ assetId: 'ETF-WORLD' }],
    existingFingerprints: ['known'],
    periodsPerYear: 252
  });

  assert.equal(calls.length, 1);
  assert.equal(result.portfolioId, 'portfolio-1');
  assert.equal(result.generatedAt, '2026-07-30T21:30:00.000Z');
  assert.equal(result.baseCurrency, 'EUR');
  assert.equal(result.valuation, valuation);
  assert.equal(result.performance, performance);
  assert.equal(result.allocation, allocation);
  assert.equal(result.analytics, analytics);
  assert.equal(result.alerts, alerts);
  assert.equal(result.currentSnapshot.totalValue, valuation.totalValue);
  assert.equal(result.currentSnapshot.source, 'DASHBOARD');
  assert.equal(Object.isFrozen(result), true);
});

test('refuse les dépendances et entrées invalides', async () => {
  const executable = { execute() {} };

  assert.throws(
    () => new BuildPortfolioDashboard({
      valuePortfolio: {},
      calculatePerformance: executable,
      calculateAllocation: executable,
      analyzeSeries: executable,
      evaluateAlerts: executable
    }),
    /valuePortfolio doit implémenter execute/
  );

  const dashboard = new BuildPortfolioDashboard({
    valuePortfolio: executable,
    calculatePerformance: executable,
    calculateAllocation: executable,
    analyzeSeries: executable,
    evaluateAlerts: executable
  });

  await assert.rejects(
    () => dashboard.execute({
      portfolioId: '',
      positions: [],
      cashBalances: [],
      baseCurrency: 'EUR'
    }),
    /portfolioId doit être une chaîne non vide/
  );

  await assert.rejects(
    () => dashboard.execute({
      portfolioId: 'portfolio-1',
      positions: [],
      cashBalances: [],
      baseCurrency: 'EUR',
      historicalSnapshots: {}
    }),
    /historicalSnapshots doit être un tableau/
  );
});
