import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { openJsonFilePortfolioRepositories } from '../../infrastructure/persistence/JsonFilePortfolioRepositories.js';
import { Transaction } from '../../domain/transaction/Transaction.js';
import { PortfolioSnapshot } from '../../domain/analytics/PortfolioSnapshot.js';
import { AlertEvent } from '../../domain/alerts/AlertEvent.js';
import { PortfolioPreferences } from '../../domain/portfolio/PortfolioPreferences.js';
import { Money } from '../../domain/money/Money.js';

test('recharge transactions, snapshots, alertes et préférences après redémarrage', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'portfolio-store-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const filePath = join(directory, 'portfolio.json');
  const repositories = await openJsonFilePortfolioRepositories({ filePath });

  await repositories.transactions.save(new Transaction({
    id: 'tx-1', portfolioId: 'p-1', accountId: 'a-1', assetId: 'asset-1', type: 'buy',
    quantity: 2, unitPrice: 10, currency: 'EUR', executedAt: '2026-07-30', createdAt: '2026-07-30T10:00:00.000Z'
  }));
  await repositories.snapshots.save(new PortfolioSnapshot({ portfolioId: 'p-1', totalValue: new Money(100, 'EUR'), capturedAt: '2026-07-31T05:00:00.000Z' }));
  await repositories.alerts.saveAll([new AlertEvent({ id: 'alert-1', ruleId: 'rule-1', portfolioId: 'p-1', type: 'RISK', severity: 'WARNING', message: 'Test', triggeredAt: '2026-07-31T05:00:00.000Z', fingerprint: 'fp-1' })]);
  await repositories.preferences.save(new PortfolioPreferences({ portfolioId: 'p-1', baseCurrency: 'EUR' }));
  await repositories.flush();

  const reopened = await openJsonFilePortfolioRepositories({ filePath });
  assert.equal((await reopened.transactions.listByPortfolio('p-1')).length, 1);
  assert.equal((await reopened.snapshots.listByPortfolio('p-1'))[0].totalValue.amount, 100);
  assert.deepEqual(await reopened.alerts.listFingerprints('p-1'), ['fp-1']);
  assert.equal((await reopened.preferences.findByPortfolio('p-1')).baseCurrency, 'EUR');
});

test('déduplique les transactions et alertes de façon durable', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'portfolio-store-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const repositories = await openJsonFilePortfolioRepositories({ filePath: join(directory, 'portfolio.json') });
  const transaction = new Transaction({ id: 'tx-1', portfolioId: 'p-1', accountId: 'a-1', assetId: 'asset-1', type: 'buy', quantity: 1, unitPrice: 10, currency: 'EUR', executedAt: '2026-07-30', createdAt: '2026-07-30T10:00:00.000Z' });
  await repositories.transactions.save(transaction);
  await repositories.transactions.save(transaction);
  const alert = new AlertEvent({ id: 'a-1', ruleId: 'r-1', portfolioId: 'p-1', type: 'RISK', severity: 'INFO', message: 'Test', triggeredAt: '2026-07-31T05:00:00.000Z', fingerprint: 'same' });
  await repositories.alerts.saveAll([alert]);
  await repositories.alerts.saveAll([new AlertEvent({ ...alert.toJSON(), id: 'a-2' })]);
  assert.equal((await repositories.transactions.listByPortfolio('p-1')).length, 1);
  assert.equal((await repositories.alerts.listByPortfolio('p-1')).length, 1);
});
