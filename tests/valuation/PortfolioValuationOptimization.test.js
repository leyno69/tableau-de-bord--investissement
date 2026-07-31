import test from 'node:test';
import assert from 'node:assert/strict';

import { PortfolioValuationService } from '../../application/services/PortfolioValuationService.js';
import { Transaction } from '../../domain/transaction/Transaction.js';
import { PortfolioPreferences } from '../../domain/portfolio/PortfolioPreferences.js';
import { MarketQuote } from '../../domain/market-data/MarketQuote.js';
import { Money } from '../../domain/money/Money.js';

function fixture(maxHistoryDays = 10) {
  let transactionLoads = 0;
  let preferenceLoads = 0;
  let historyLoads = 0;
  const transaction = new Transaction({ id: 'buy', portfolioId: 'p-1', accountId: 'a-1', assetId: 'WORLD', type: 'buy', quantity: 1, unitPrice: 100, currency: 'EUR', executedAt: '2026-01-01', createdAt: '2026-01-01T12:00:00.000Z' });
  const service = new PortfolioValuationService({
    transactionRepository: { async listByPortfolio() { transactionLoads += 1; return [transaction]; } },
    preferencesRepository: { async findByPortfolio() { preferenceLoads += 1; return new PortfolioPreferences({ portfolioId: 'p-1' }); } },
    marketDataProvider: { async getHistory() { historyLoads += 1; return [new MarketQuote({ assetId: 'WORLD', price: new Money(110, 'EUR'), quotedAt: '2026-01-01T18:00:00.000Z', source: 'TEST' })]; } },
    exchangeRateProvider: { async getRate() { return 1; } },
    maxHistoryDays
  });
  return { service, counts: () => ({ transactionLoads, preferenceLoads, historyLoads }) };
}

test('charge transactions, préférences et historique de marché une seule fois par série', async () => {
  const { service, counts } = fixture();
  const history = await service.history({ portfolioId: 'p-1', from: '2026-01-01', to: '2026-01-03' });
  assert.equal(history.length, 3);
  assert.deepEqual(counts(), { transactionLoads: 1, preferenceLoads: 1, historyLoads: 1 });
});

test('limite les intervalles historiques excessifs', async () => {
  const { service } = fixture(2);
  await assert.rejects(() => service.history({ portfolioId: 'p-1', from: '2026-01-01', to: '2026-01-03' }), /2 jours/);
});

test('valide le plafond lors de la construction', () => {
  assert.throws(() => fixture(0), /maxHistoryDays/);
});
