import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_BATCH_JOBS,
  createLabBatchDefinition,
  runLabBatch
} from '../../leynor-lab-batch.js';

const allocation = [
  { id: 'world', label: 'ETF Monde', weight: 0.8, annualReturn: 0.07, annualVolatility: 0.16 },
  { id: 'bonds', label: 'Obligations', weight: 0.2, annualReturn: 0.03, annualVolatility: 0.06 }
];

const baseDefinition = {
  portfolioCount: 20,
  years: 5,
  initialAmount: 2000,
  monthlyContribution: 100,
  annualInflation: 0.02,
  annualFees: 0.002,
  goal: 15000,
  seed: 69,
  allocation
};

const input = {
  name: 'Comparaison par lots',
  jobs: [
    { id: 'independent', label: 'Indépendant', type: 'independent', definition: baseDefinition },
    {
      id: 'correlated',
      label: 'Corrélé',
      type: 'correlated',
      definition: {
        ...baseDefinition,
        correlationMatrix: [[1, 0.4], [0.4, 1]]
      }
    }
  ]
};

test('la définition de lot est immuable, bornée et refuse les doublons', () => {
  const definition = createLabBatchDefinition(input);
  assert.equal(definition.jobs.length, 2);
  assert.ok(Object.isFrozen(definition));
  assert.ok(Object.isFrozen(definition.jobs));
  assert.throws(() => createLabBatchDefinition({ jobs: [] }), /entre 1/);
  assert.throws(() => createLabBatchDefinition({
    jobs: Array.from({ length: MAX_BATCH_JOBS + 1 }, (_, index) => ({ id: `job-${index}`, definition: baseDefinition }))
  }), /entre 1/);
  assert.throws(() => createLabBatchDefinition({
    jobs: [
      { id: 'meme', definition: baseDefinition },
      { id: 'meme', definition: baseDefinition }
    ]
  }), /dupliqué/);
});

test('un lot identique produit exactement les mêmes résultats', async () => {
  const options = { yieldControl: async () => {} };
  const first = await runLabBatch(input, options);
  const second = await runLabBatch(input, options);
  assert.deepEqual(first, second);
  assert.equal(first.results.length, 2);
  assert.ok(Object.isFrozen(first.results));
  assert.match(first.methodology.reproducibility, /reproductible/);
});

test('la progression est monotone, bornée et expose le job courant', async () => {
  const progress = [];
  await runLabBatch(input, {
    yieldControl: async () => {},
    onProgress(value) { progress.push(value); }
  });

  assert.equal(progress[0].completed, 0);
  assert.equal(progress.at(-1).completed, 2);
  assert.equal(progress.at(-1).ratio, 1);
  assert.ok(progress.some(value => value.currentJobId === 'independent'));
  assert.ok(progress.some(value => value.currentJobId === 'correlated'));
  assert.ok(progress.every(value => value.ratio >= 0 && value.ratio <= 1));
  assert.ok(progress.every((value, index) => index === 0 || value.completed >= progress[index - 1].completed));
  assert.ok(progress.every(Object.isFrozen));
});

test('l’annulation arrête le lot entre deux jobs sans produire un résultat partiel silencieux', async () => {
  const controller = new AbortController();
  let yields = 0;

  await assert.rejects(
    runLabBatch(input, {
      signal: controller.signal,
      async yieldControl() {
        yields += 1;
        controller.abort();
      }
    }),
    error => error?.name === 'AbortError' && /annulée/.test(error.message)
  );

  assert.equal(yields, 1);
});

test('un type de simulation inconnu est refusé explicitement', () => {
  assert.throws(() => createLabBatchDefinition({
    jobs: [{ id: 'invalide', type: 'magique', definition: baseDefinition }]
  }), /independent ou correlated/);
});
