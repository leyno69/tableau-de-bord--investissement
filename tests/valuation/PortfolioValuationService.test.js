import test from 'node:test';
import assert from 'node:assert/strict';

import { PortfolioValuationService } from '../../application/services/PortfolioValuationService.js';
import { Transaction } from '../../domain/transaction/Transaction.js';
import { PortfolioPreferences } from '../../domain/portfolio/PortfolioPreferences.js';
import { MarketQuote } from '../../domain/market-data/MarketQuote.js';
import { Money } from '../../domain/money/Money.js';
import { InMemoryMarketDataProvider } from '../../infrastructure/market-data/InMemoryMarketDataProvider.js';

const transaction = properties => new Transaction({
  id: properties.id,
  portfolioId: 'portfolio-1',
  accountId: 'pea-1',
  assetId: properties.assetId ?? null,
  type: properties.type,
  quantity: properties.quantity ?? 0,
  unitPrice: properties.unitPrice ?? 0,
  amount: properties.amount ?? null,
  currency: 'EUR',
  executedAt: properties.executedAt,
  status: properties.status ?? 'confirmed',
  context: properties.context ?? 'REAL',
  createdAt: `${properties.executedAt}T12:00:00.000Z`
});

const quote = (amount, quotedAt) => new MarketQuote({
  assetId: 'WORLD',
  price: new Money(amount, 'EUR'),
  quotedAt,
  source: 'TEST'
});

function service() {
  const transactions = [
    transaction({ id: 'deposit', type: 'deposit', amount: 1000, executedAt: '2026-01-01' }),
    transaction({ id: 'buy', type: 'buy', assetId: 'WORLD', quantity: 2, unitPrice: 100, executedAt: '2026-01-02' }),
    transaction({ id: 'future', type: 'buy', assetId: 'WORLD', quantity: 1, unitPrice: 120, executedAt: '2026-01-06' }),
    transaction({ id: 'simulation', type: 'buy', assetId: 'WORLD', quantity: 10, unitPrice: 1, executedAt: '2026-01-02', context: 'SIMULATION' })
  ];
  return new PortfolioValuationService({
    transactionRepository: { async listByPortfolio() { return transactions; } },
    preferencesRepository: { async findByPortfolio() { return new PortfolioPreferences({ portfolioId: 'portfolio-1', baseCurrency: 'EUR' }); } },
    marketDataProvider: new InMemoryMarketDataProvider([
      quote(100, '2026-01-02T17:30:00.000Z'),
      quote(110, '2026-01-03T17:30:00.000Z'),
      quote(120, '2026-01-06T17:30:00.000Z')
    ]),
    exchangeRateProvider: { async getRate() { return 1; } }
  });
}

test('valorise le portefeuille avec les positions reconstruites à la date demandée', async () => {
  const result = await service().valueAt({ portfolioId: 'portfolio-1', date: '2026-01-03' });
  assert.equal(result.positions.length, 1);
  assert.equal(result.positions[0].quantity, 2);
  assert.equal(result.positionsValue.amount, 220);
  assert.equal(result.cashValue.amount, 800);
  assert.equal(result.totalValue.amount, 1020);
  assert.equal(result.marketData.WORLD.carriedForward, false);
});

test('reporte la dernière cotation disponible pendant un jour sans cotation', async () => {
  const result = await service().valueAt({ portfolioId: 'portfolio-1', date: '2026-01-04' });
  assert.equal(result.totalValue.amount, 1020);
  assert.equal(result.marketData.WORLD.quotedAt, '2026-01-03T17:30:00.000Z');
  assert.equal(result.marketData.WORLD.carriedForward, true);
});

test('produit un historique quotidien immuable sans appliquer les transactions futures', async () => {
  const history = await service().history({ portfolioId: 'portfolio-1', from: '2026-01-01', to: '2026-01-04' });
  assert.deepEqual(history.map(item => item.totalValue.amount), [1000, 1000, 1020, 1020]);
  assert.equal(Object.isFrozen(history), true);
});

test('refuse une date invalide et une période inversée', async () => {
  await assert.rejects(() => service().valueAt({ portfolioId: 'portfolio-1', date: '31/01/2026' }), /YYYY-MM-DD/);
  await assert.rejects(() => service().history({ portfolioId: 'portfolio-1', from: '2026-01-04', to: '2026-01-01' }), /antérieur/);
});
