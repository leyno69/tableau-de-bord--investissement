import test from 'node:test';
import assert from 'node:assert/strict';
import { diagnoseHistoricalCoverage, locateAgainstThresholds } from './historicalCoverageDiagnostics.js';

const simulation = {
  nominal: { p05: 8786.9998, p25: 9708.7279, median: 10407.2145, p75: 11132.3223, p95: 12200.9674 },
  drawdown: { median: 0.0673617, p95: 0.1582158, maximum: 0.2798064 },
  drawdownSamplingFrequency: 'monthly'
};

test('positionne une valeur historique dans une bande sans verdict si la fréquence est appariée', () => {
  const result = diagnoseHistoricalCoverage({ simulation, historical: { finalValue: 10484.2, maxDrawdown: -0.1385, drawdownSamplingFrequency: 'monthly' } });
  assert.equal(result.finalValue.band, 'median-p75');
  assert.equal(result.drawdown.band, 'median-p95');
  assert.equal(result.drawdown.comparable, true);
  assert.equal(result.interpretation.verdict, null);
  assert.equal(result.interpretation.classification, 'descriptive-location-only');
});

test('refuse de positionner un drawdown quotidien contre une simulation mensuelle', () => {
  const result = diagnoseHistoricalCoverage({ simulation, historical: { finalValue: 10484.2, maxDrawdown: -0.2168, drawdownSamplingFrequency: 'daily' } });
  assert.equal(result.drawdown.comparable, false);
  assert.equal(result.drawdown.band, null);
  assert.equal(result.drawdown.reason, 'sampling-frequency-mismatch');
});

test('conserve les observations hors des bornes sans les qualifier de succès ou échec', () => {
  const result = diagnoseHistoricalCoverage({ simulation, historical: { finalValue: 13000, maxDrawdown: -0.31, drawdownSamplingFrequency: 'monthly' } });
  assert.equal(result.finalValue.band, 'above-p95');
  assert.equal(result.drawdown.band, 'above-maximum');
  assert.equal(result.interpretation.verdict, null);
});

test('la fréquence de drawdown doit être explicite des deux côtés', () => {
  assert.throws(() => diagnoseHistoricalCoverage({ simulation: { ...simulation, drawdownSamplingFrequency: undefined }, historical: { finalValue: 10000, maxDrawdown: -0.1, drawdownSamplingFrequency: 'monthly' } }), /drawdownSamplingFrequency/);
});

test('les seuils doivent être ordonnés', () => {
  assert.throws(() => locateAgainstThresholds(1, [{ label: 'a', value: 2 }, { label: 'b', value: 1 }]), /ordonné/);
});
