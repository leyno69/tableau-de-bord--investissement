import test from 'node:test';
import assert from 'node:assert/strict';
import { diagnoseHistoricalCoverage, locateAgainstThresholds } from './historicalCoverageDiagnostics.js';

const simulation = {
  nominal: { p05: 8786.9998, p25: 9708.7279, median: 10407.2145, p75: 11132.3223, p95: 12200.9674 },
  drawdown: { median: 0.0673617, p95: 0.1582158, maximum: 0.2798064 }
};

test('positionne une valeur historique dans une bande sans verdict', () => {
  const result = diagnoseHistoricalCoverage({ simulation, historical: { finalValue: 10484.2, maxDrawdown: -0.1385 } });
  assert.equal(result.finalValue.band, 'median-p75');
  assert.equal(result.drawdown.band, 'median-p95');
  assert.equal(result.interpretation.verdict, null);
  assert.equal(result.interpretation.classification, 'descriptive-location-only');
});

test('conserve les observations hors des bornes sans les qualifier de succès ou échec', () => {
  const result = diagnoseHistoricalCoverage({ simulation, historical: { finalValue: 13000, maxDrawdown: -0.31 } });
  assert.equal(result.finalValue.band, 'above-p95');
  assert.equal(result.drawdown.band, 'above-maximum');
  assert.equal(result.interpretation.verdict, null);
});

test('les seuils doivent être ordonnés', () => {
  assert.throws(() => locateAgainstThresholds(1, [{ label: 'a', value: 2 }, { label: 'b', value: 1 }]), /ordonné/);
});
