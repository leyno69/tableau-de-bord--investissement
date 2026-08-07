import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareAcceleratedHistoricalCampaign } from './prepare.mjs';

test('prépare une campagne accélérée reproductible sans fabriquer de fenêtre ni de résultat', () => {
  const first = prepareAcceleratedHistoricalCampaign();
  const second = prepareAcceleratedHistoricalCampaign();
  assert.deepEqual(first, second);
  assert.equal(first.status, 'blocked-before-locked-historical-run');
  assert.equal(first.windowRegistry.windows.length, 0);
  assert.equal(first.results.length, 0);
  assert.equal(first.engineModified, false);
});

test('conserve les limites d’autorité de la preuve rétrospective', () => {
  const artifact = prepareAcceleratedHistoricalCampaign();
  assert.equal(artifact.protocol.positiveDecisionAuthority, 'retrospective-support-only');
  assert.equal(artifact.protocol.negativeDecisionAuthority, 'may-reject-after-independent-audit');
  assert.equal(artifact.launch.mayValidateProbabilityClaim, false);
  assert.equal(artifact.launch.mayExposeRealWorldProbability, false);
});

test('bloque explicitement les données manquantes et la sélection des fenêtres avant métadonnées', () => {
  const artifact = prepareAcceleratedHistoricalCampaign();
  assert.ok(artifact.launch.blockers.includes('licensed-data:worldProxy:missing'));
  assert.ok(artifact.launch.blockers.includes('licensed-data:paej:missing'));
  assert.ok(artifact.launch.blockers.includes('historical-window-registry:empty-before-source-metadata'));
  assert.ok(artifact.launch.blockers.includes('dependence-audit:method-not-locked'));
});
