import test from 'node:test';
import assert from 'node:assert/strict';
import { runHistoricalReplay } from './portfolioHistoricalReplayEngine.js';

function baseInput(overrides = {}) {
  return {
    replayId: 'fixture-replay-v1',
    initialCash: 1000,
    allocation: [
      { ticker: 'AAA', weight: 0.6 },
      { ticker: 'BBB', weight: 0.4 }
    ],
    costPolicy: { transactionCostBps: 10 },
    seriesByTicker: {
      AAA: [
        { date: '2020-01-02', availableAt: '2020-01-02', price: 100 },
        { date: '2020-01-03', availableAt: '2020-01-03', price: 110 },
        { date: '2020-01-06', availableAt: '2020-01-06', price: 105 }
      ],
      BBB: [
        { date: '2020-01-02', availableAt: '2020-01-02', price: 50 },
        { date: '2020-01-03', availableAt: '2020-01-03', price: 45 },
        { date: '2020-01-06', availableAt: '2020-01-06', price: 55 }
      ]
    },
    startDate: '2020-01-02',
    endDate: '2020-01-06',
    contributions: [{ date: '2020-01-03', amount: 100 }],
    rebalanceDates: ['2020-01-06'],
    ...overrides
  };
}

test('le replay est déterministe et conserve un journal complet', () => {
  const first = runHistoricalReplay(baseInput());
  const second = runHistoricalReplay(baseInput());
  assert.deepEqual(first, second);
  assert.equal(first.totalContributed, 1100);
  assert.ok(first.totalCosts > 0);
  assert.ok(first.eventLog.some(event => event.type === 'CONTRIBUTION'));
  assert.ok(first.eventLog.some(event => event.reason === 'REBALANCE'));
  assert.equal(first.calendar.at(-1), '2020-01-06');
});

test('aucune observation disponible après sa date ne peut être utilisée', () => {
  const input = baseInput();
  input.seriesByTicker.AAA = input.seriesByTicker.AAA.map(point => ({ ...point }));
  input.seriesByTicker.AAA[1].availableAt = '2020-01-06';
  assert.throws(() => runHistoricalReplay(input), /fuite temporelle/);
});

test('un événement sur une date non commune est rejeté au lieu d’être déplacé silencieusement', () => {
  assert.throws(() => runHistoricalReplay(baseInput({ contributions: [{ date: '2020-01-04', amount: 100 }] })), /hors calendrier commun/);
});

test('une allocation dont la somme diffère de 100 % est refusée', () => {
  assert.throws(() => runHistoricalReplay(baseInput({ allocation: [{ ticker: 'AAA', weight: 0.7 }, { ticker: 'BBB', weight: 0.4 }] })), /somme des poids/);
});

test('startDate et endDate doivent être des dates communes, sans interpolation', () => {
  assert.throws(() => runHistoricalReplay(baseInput({ startDate: '2020-01-01' })), /date commune/);
});

test('les coûts diminuent la valeur par rapport au même chemin sans coûts', () => {
  const withCosts = runHistoricalReplay(baseInput());
  const withoutCosts = runHistoricalReplay(baseInput({ costPolicy: { transactionCostBps: 0 } }));
  assert.ok(withCosts.finalValue < withoutCosts.finalValue);
});

test('un apport le premier jour est exécuté explicitement et comptabilisé', () => {
  const replay = runHistoricalReplay(baseInput({ contributions: [{ date: '2020-01-02', amount: 100 }], rebalanceDates: [] }));
  assert.equal(replay.totalContributed, 1100);
  assert.ok(replay.eventLog.some(event => event.type === 'CONTRIBUTION' && event.date === '2020-01-02'));
});
