import test from 'node:test';
import assert from 'node:assert/strict';
import { findSimulationPreset } from '../simulation-presets.js';
import { assessExactHistoricalWindowForPreset } from './portfolioHistoricalWindowFeasibility.js';

const AS_OF = '2026-08-07';

test('le preset beginner est bloqué par l’historique trop court de WPEA', () => {
  const result = assessExactHistoricalWindowForPreset(findSimulationPreset('beginner'), { asOf: AS_OF });
  assert.equal(result.exactReplayEligible, false);
  const wpea = result.instruments.find(item => item.ticker === 'WPEA');
  const paej = result.instruments.find(item => item.ticker === 'PAEJ');
  assert.equal(wpea.blocker, 'insufficient-exact-history');
  assert.equal(paej.status, 'eligible');
});

test('le preset growth conserve SMH comme ambiguïté et WPEA comme historique insuffisant', () => {
  const result = assessExactHistoricalWindowForPreset(findSimulationPreset('growth'), { asOf: AS_OF });
  assert.equal(result.exactReplayEligible, false);
  assert.equal(result.instruments.find(item => item.ticker === 'NVDA').status, 'eligible');
  assert.equal(result.instruments.find(item => item.ticker === 'WPEA').blocker, 'insufficient-exact-history');
  assert.equal(result.instruments.find(item => item.ticker === 'SMH').blocker, 'instrument-identity-ambiguous');
});

test('le preset DCA 20 ans ne peut pas utiliser WPEA exact', () => {
  const result = assessExactHistoricalWindowForPreset(findSimulationPreset('dca'), { asOf: AS_OF });
  assert.equal(result.requiredStart, '2006-08-07');
  assert.equal(result.exactReplayEligible, false);
  assert.equal(result.instruments[0].blocker, 'insufficient-exact-history');
});
