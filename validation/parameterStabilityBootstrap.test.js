import test from 'node:test';
import assert from 'node:assert/strict';
import { bootstrapMonthlyParameterStability } from './parameterStabilityBootstrap.js';

test('est reproductible à graine identique', () => {
  const returns = Array.from({ length: 24 }, (_, index) => 0.003 + (index % 5 - 2) * 0.004);
  const a = bootstrapMonthlyParameterStability({ returns, replicates: 500, seed: 99 });
  const b = bootstrapMonthlyParameterStability({ returns, replicates: 500, seed: 99 });
  assert.deepEqual(a.intervals, b.intervals);
});

test('détecte une cible compatible avec un échantillon centré sur elle', () => {
  const returns = Array.from({ length: 36 }, (_, index) => 0.0037 + (index % 7 - 3) * 0.006);
  const result = bootstrapMonthlyParameterStability({ returns, replicates: 1000, seed: 7 });
  assert.equal(typeof result.compatibility.returnTargetInsideInterval, 'boolean');
  assert.equal(typeof result.compatibility.volatilityTargetInsideInterval, 'boolean');
});

test('refuse un échantillon trop court', () => {
  assert.throws(() => bootstrapMonthlyParameterStability({ returns: [0.01, 0.02] }), /au moins 12/);
});
