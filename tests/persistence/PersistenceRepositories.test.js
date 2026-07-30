import test from 'node:test';
import assert from 'node:assert/strict';

import { Transaction } from '../../domain/transaction/Transaction.js';
import { Money } from '../../domain/money/Money.js';
import { PortfolioSnapshot } from '../../domain/analytics/PortfolioSnapshot.js';
import { AlertEvent } from '../../domain/alerts/AlertEvent.js';
import { PortfolioPreferences } from '../../domain/portfolio/PortfolioPreferences.js';
import {
  InMemoryTransactionRepository,
  InMemoryPortfolioSnapshotRepository,
  InMemoryAlertEventRepository,
  InMemoryPortfolioPreferencesRepository
} from '../../infrastructure/persistence/InMemoryRepositories.js';
import { PersistDashboardState } from '../../application/use-cases/PersistDashboardState.js';

const transaction = (id, executedAt, portfolioId = 'portfolio-1') => new Transaction({
  id,
  portfolioId,
  accountId: 'account-1',
  assetId: 'ETF-WORLD',
  type: Transaction.TYPES.BUY,
  quantity: 1,
  unitPrice: 100,
  currency: 'EUR',
  executedAt,
  createdAt: '2026-01-01T00:00:00Z'
});

const snapshot = (amount, capturedAt) => new PortfolioSnapshot({
  portfolioId: 'portfolio-1',
  totalValue: new Money(amount, 'EUR'),
  capturedAt,
  source: 'DASHBOARD'
});

const alert = (id, fingerprint) => new AlertEvent({
  id,
  ruleId: 'rule-1',
  portfolioId: 'portfolio-1',
  type: 'CONCENTRATION',
  severity: 'WARNING',
  message: 'Concentration élevée.',
  triggeredAt: '2026-01-03T00:00:00Z',
  fingerprint,
  context: { weight: 0.3 }
});

test('persiste et trie les transactions sans autoriser un écrasement incohérent', async () => {
  const repository = new InMemoryTransactionRepository();
  await repository.save(transaction('tx-2', '2026-01-02'));
  await repository.save(transaction('tx-1', '2026-01-01'));

  assert.deepEqual((await repository.listByPortfolio('portfolio-1')).map(item => item.id), ['tx-1', 'tx-2']);
  assert.equal((await repository.findById('tx-1')).id, 'tx-1');
  await repository.save(transaction('tx-1', '2026-01-01'));
  await assert.rejects(() => repository.save(transaction('tx-1', '2026-01-04')), /contenu différent/);
});

test('conserve les snapshots par portefeuille et intervalle', async () => {
  const repository = new InMemoryPortfolioSnapshotRepository();
  await repository.save(snapshot(100, '2026-01-01'));
  await repository.save(snapshot(110, '2026-01-02'));
  await repository.save(snapshot(120, '2026-01-03'));

  const items = await repository.listByPortfolio('portfolio-1', {
    from: '2026-01-02',
    to: '2026-01-03'
  });
  assert.deepEqual(items.map(item => item.totalValue.amount), [110, 120]);
  await assert.rejects(
    () => repository.save(snapshot(999, '2026-01-03')),
    /snapshot différent/
  );
});

test('déduplique les alertes par portefeuille et empreinte', async () => {
  const repository = new InMemoryAlertEventRepository();
  await repository.saveAll([alert('a-1', 'same'), alert('a-2', 'same'), alert('a-3', 'other')]);

  assert.deepEqual((await repository.listByPortfolio('portfolio-1')).map(item => item.id), ['a-1', 'a-3']);
  assert.deepEqual(await repository.listFingerprints('portfolio-1'), ['same', 'other']);
});

test('remplace les préférences d’un portefeuille avec validation métier', async () => {
  const repository = new InMemoryPortfolioPreferencesRepository();
  const first = new PortfolioPreferences({ portfolioId: 'portfolio-1' });
  const updated = new PortfolioPreferences({ portfolioId: 'portfolio-1', baseCurrency: 'USD', periodsPerYear: 365 });

  await repository.save(first);
  await repository.save(updated);
  assert.equal((await repository.findByPortfolio('portfolio-1')).baseCurrency, 'USD');
  assert.equal(Object.isFrozen(updated.alertThresholds), true);
  assert.throws(
    () => new PortfolioPreferences({
      portfolioId: 'portfolio-1',
      alertThresholds: { concentrationWarning: 0.5, concentrationCritical: 0.4 }
    }),
    /critique/
  );
});

test('persiste le snapshot et les alertes issus du tableau de bord', async () => {
  const snapshotRepository = new InMemoryPortfolioSnapshotRepository();
  const alertEventRepository = new InMemoryAlertEventRepository();
  const useCase = new PersistDashboardState({ snapshotRepository, alertEventRepository });
  const currentSnapshot = snapshot(125, '2026-01-04');
  const event = alert('a-4', 'fresh');

  const result = await useCase.execute({
    portfolioId: 'portfolio-1',
    currentSnapshot,
    alerts: { events: [event] }
  });

  assert.equal(result.snapshot, currentSnapshot);
  assert.equal(result.persistedAlertCount, 1);
  assert.equal((await snapshotRepository.listByPortfolio('portfolio-1')).length, 1);
  assert.equal((await alertEventRepository.listByPortfolio('portfolio-1')).length, 1);
  assert.equal(Object.isFrozen(result), true);
});
