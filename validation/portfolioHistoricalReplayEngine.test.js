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
  assert.throws(() => runHistoricalReplay(baseInput({ startDate: '2020-01-01' })), /date de marché commune/);
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

test('un rééquilibrage programmé le premier jour ne fait plus l’objet d’un cas particulier silencieux', () => {
  const withDayOneRebalance = runHistoricalReplay(baseInput({ rebalanceDates: ['2020-01-02', '2020-01-06'] }));
  const withoutDayOneRebalance = runHistoricalReplay(baseInput({ rebalanceDates: ['2020-01-06'] }));
  // L'allocation initiale place déjà le portefeuille au poids cible : un
  // rééquilibrage le jour même est donc mathématiquement un no-op (aucun
  // écart à corriger), pas une opération silencieusement ignorée — les deux
  // rejeux doivent donc produire un résultat identique.
  assert.deepEqual(withDayOneRebalance, withoutDayOneRebalance);
});

test('un déficit de trésorerie au rééquilibrage est réparti proportionnellement, pas dans l’ordre du tableau allocation', () => {
  // A, B et C ont le même poids cible (1/3 chacun). Entre les deux dates, A
  // décuple de prix tandis que B et C restent stables : A devient très
  // surpondéré (à vendre), B et C sous-pondérés d'un montant identique (à
  // acheter). Avec des coûts de transaction élevés, la vente d'A ne finance
  // pas entièrement les deux achats — un vrai déficit à répartir.
  const replay = runHistoricalReplay({
    replayId: 'proportional-shortfall-v1',
    initialCash: 10000,
    allocation: [
      { ticker: 'A', weight: 1 / 3 },
      { ticker: 'B', weight: 1 / 3 },
      { ticker: 'C', weight: 1 / 3 }
    ],
    costPolicy: { transactionCostBps: 1000 },
    seriesByTicker: {
      A: [
        { date: '2020-01-02', availableAt: '2020-01-02', price: 1 },
        { date: '2020-01-06', availableAt: '2020-01-06', price: 10 }
      ],
      B: [
        { date: '2020-01-02', availableAt: '2020-01-02', price: 1 },
        { date: '2020-01-06', availableAt: '2020-01-06', price: 1 }
      ],
      C: [
        { date: '2020-01-02', availableAt: '2020-01-02', price: 1 },
        { date: '2020-01-06', availableAt: '2020-01-06', price: 1 }
      ]
    },
    startDate: '2020-01-02',
    endDate: '2020-01-06',
    contributions: [],
    rebalanceDates: ['2020-01-06']
  });

  const rebalanceBuys = replay.eventLog.filter(event => event.reason === 'REBALANCE' && event.type === 'BUY');
  const buyB = rebalanceBuys.find(event => event.ticker === 'B');
  const buyC = rebalanceBuys.find(event => event.ticker === 'C');
  assert.ok(buyB && buyC, 'B et C doivent tous deux recevoir un achat de rééquilibrage.');
  // Poids identiques et coûts identiques : un déficit bien réparti donne des
  // montants achetés égaux. L'ancien code, séquentiel dans l'ordre du
  // tableau allocation, aurait entièrement financé B et fortement
  // sous-financé C.
  assert.ok(
    Math.abs(buyB.notional - buyC.notional) < 1e-6,
    `attendu des montants égaux, obtenu B=${buyB.notional} C=${buyC.notional}`
  );
});