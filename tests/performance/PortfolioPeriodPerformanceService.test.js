import test from 'node:test';
import assert from 'node:assert/strict';

import { PortfolioPeriodPerformanceService } from '../../application/services/PortfolioPeriodPerformanceService.js';

function service(calls = []) {
  return new PortfolioPeriodPerformanceService({
    valuationService: {
      async history(input) {
        calls.push(input);
        return [
          { date: input.from, totalValue: { amount: 100, currency: 'EUR' }, complete: true },
          { date: input.to, totalValue: { amount: 110, currency: 'EUR' }, complete: true }
        ];
      }
    }
  });
}

test('calcule 1D, 1W, 1M, YTD et 1Y', async () => {
  const calls = [];
  const result = await service(calls).calculate({ portfolioId: 'p-1', date: '2026-07-31' });
  assert.deepEqual(Object.keys(result.periods), ['1D', '1W', '1M', 'YTD', '1Y']);
  assert.equal(result.periods['1D'].requestedFrom, '2026-07-30');
  assert.equal(result.periods['1W'].requestedFrom, '2026-07-24');
  assert.equal(result.periods['1M'].requestedFrom, '2026-07-01');
  assert.equal(result.periods.YTD.requestedFrom, '2026-01-01');
  assert.equal(result.periods['1Y'].requestedFrom, '2025-07-31');
  assert.equal(result.periods['1D'].rate, 0.1);
  assert.deepEqual(result.periods['1D'].absoluteChange, { amount: 10, currency: 'EUR' });
  assert.equal(calls.length, 5);
});

test('retourne une période non calculable lorsque la série est vide', async () => {
  const instance = new PortfolioPeriodPerformanceService({ valuationService: { async history() { return []; } } });
  const result = await instance.calculate({ portfolioId: 'p-1', date: '2026-07-31' });
  assert.equal(result.periods['1D'].rate, null);
  assert.equal(result.periods['1D'].complete, false);
});

test('refuse une date civile invalide', async () => {
  await assert.rejects(() => service().calculate({ portfolioId: 'p-1', date: '31/07/2026' }), /YYYY-MM-DD/);
});
