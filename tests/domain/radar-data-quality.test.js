import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assessRadarObservation,
  canProduceRadarSignal,
  createRadarObservation,
  createRadarSourceDefinition,
  summarizeRadarDataset
} from '../../radar-data-quality.js';

function source(overrides = {}) {
  return createRadarSourceDefinition({
    id: overrides.id ?? 'market-primary',
    name: overrides.name ?? 'Marché primaire',
    kind: overrides.kind ?? 'market',
    provider: overrides.provider ?? 'Provider A',
    expectedLatencyMs: overrides.expectedLatencyMs ?? 5_000,
    maximumAgeMs: overrides.maximumAgeMs ?? 60_000,
    minimumCoverage: overrides.minimumCoverage ?? 0.9,
    minimumCompleteness: overrides.minimumCompleteness ?? 0.9,
    license: overrides.license ?? 'Licence documentée',
    methodology: overrides.methodology ?? 'Observation directe horodatée',
    limitations: overrides.limitations ?? ['Retard possible en période volatile']
  });
}

function observation(sourceDefinition, overrides = {}) {
  return createRadarObservation({
    source: sourceDefinition,
    assetId: overrides.assetId ?? 'AAPL',
    observedAt: overrides.observedAt ?? '2026-08-04T18:00:00.000Z',
    receivedAt: overrides.receivedAt ?? '2026-08-04T18:00:02.000Z',
    value: overrides.value ?? 200,
    unit: overrides.unit ?? 'USD',
    coverage: overrides.coverage ?? 1,
    completeness: overrides.completeness ?? 1,
    lineageId: overrides.lineageId ?? `${sourceDefinition.id}:AAPL:20260804T180000Z`,
    datasetFingerprint: overrides.datasetFingerprint ?? `sha256:${sourceDefinition.id}`,
    flags: overrides.flags ?? []
  });
}

test('une observation fraîche, complète et traçable est acceptée', () => {
  const item = observation(source());
  const assessment = assessRadarObservation(item, new Date('2026-08-04T18:00:30.000Z'));

  assert.equal(assessment.status, 'accepted');
  assert.equal(assessment.usable, true);
  assert.deepEqual(assessment.reasons, []);
  assert.equal(assessment.lineageId, item.lineageId);
});

test('une observation périmée ou incomplète est rejetée', () => {
  const item = observation(source(), { completeness: 0.4 });
  const assessment = assessRadarObservation(item, new Date('2026-08-04T18:02:00.000Z'));

  assert.equal(assessment.status, 'rejected');
  assert.equal(assessment.usable, false);
  assert.ok(assessment.reasons.includes('stale'));
  assert.ok(assessment.reasons.includes('incomplete'));
});

test('un retard seul dégrade sans rendre automatiquement la donnée inutilisable', () => {
  const item = observation(source({ expectedLatencyMs: 500 }), {
    receivedAt: '2026-08-04T18:00:02.000Z'
  });
  const assessment = assessRadarObservation(item, new Date('2026-08-04T18:00:30.000Z'));

  assert.equal(assessment.status, 'degraded');
  assert.equal(assessment.usable, true);
  assert.deepEqual(assessment.reasons, ['late']);
});

test('le radar exige plusieurs sources indépendantes et plusieurs familles', () => {
  const observations = [
    observation(source({ id: 'market-a', kind: 'market' })),
    observation(source({ id: 'fundamental-a', kind: 'fundamental' }), { datasetFingerprint: 'sha256:fundamental-a' }),
    observation(source({ id: 'news-a', kind: 'news' }), { datasetFingerprint: 'sha256:news-a' })
  ];
  const summary = summarizeRadarDataset(observations, new Date('2026-08-04T18:00:30.000Z'));
  const decision = canProduceRadarSignal(summary);

  assert.equal(summary.independentSourceCount, 3);
  assert.equal(summary.sourceKindCount, 3);
  assert.equal(summary.usableRatio, 1);
  assert.equal(decision.allowed, true);
});

test('le radar refuse un signal alimenté par une seule source répétée', () => {
  const shared = source({ id: 'market-a', kind: 'market' });
  const observations = [
    observation(shared, { assetId: 'AAPL', lineageId: 'a' }),
    observation(shared, { assetId: 'MSFT', lineageId: 'b' }),
    observation(shared, { assetId: 'NVDA', lineageId: 'c' })
  ];
  const summary = summarizeRadarDataset(observations, new Date('2026-08-04T18:00:30.000Z'));
  const decision = canProduceRadarSignal(summary);

  assert.equal(decision.allowed, false);
  assert.ok(decision.reasons.includes('insufficient_independent_sources'));
  assert.ok(decision.reasons.includes('insufficient_source_diversity'));
});

test('les définitions refusent les familles et seuils invalides', () => {
  assert.throws(() => source({ kind: 'rumeur' }), /kind doit appartenir/);
  assert.throws(() => source({ minimumCoverage: 1.2 }), /compris entre 0 et 1/);
});
