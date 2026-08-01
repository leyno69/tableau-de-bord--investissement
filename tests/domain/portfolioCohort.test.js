import test from 'node:test';
import assert from 'node:assert/strict';
import { createPortfolioCohort } from '../../lab/portfolio-cohort.js';

test('la cohorte couvre trois capitaux et trois profils', () => {
  const cohort = createPortfolioCohort({ variantsPerCell: 5 });
  assert.equal(cohort.length, 45);
  assert.deepEqual([...new Set(cohort.map(item => item.initialCapital))], [2000, 5000, 10000]);
  assert.deepEqual([...new Set(cohort.map(item => item.profile))], ['prudent', 'modere', 'agressif']);
});

test('chaque portefeuille est intégralement alloué et possède une variante', () => {
  const cohort = createPortfolioCohort({ variantsPerCell: 5 });
  for (const portfolio of cohort) {
    const total = Object.values(portfolio.weights).reduce((sum, value) => sum + value, 0);
    assert.ok(Math.abs(total - 1) < 1e-10);
    assert.ok(portfolio.variant >= 1 && portfolio.variant <= 5);
  }
});

test('le risque augmente entre prudent, modéré et agressif', () => {
  const cohort = createPortfolioCohort({ variantsPerCell: 1 });
  const prudent = cohort.find(item => item.profile === 'prudent' && item.initialCapital === 2000);
  const modere = cohort.find(item => item.profile === 'modere' && item.initialCapital === 2000);
  const agressif = cohort.find(item => item.profile === 'agressif' && item.initialCapital === 2000);
  const risky = portfolio => portfolio.weights.NVDA + portfolio.weights.AMD + portfolio.weights.TSLA + portfolio.weights.BTCUSD;
  assert.ok(risky(prudent) < risky(modere));
  assert.ok(risky(modere) < risky(agressif));
  assert.ok(prudent.weights.CASH > modere.weights.CASH);
  assert.ok(modere.weights.CASH > agressif.weights.CASH);
});
