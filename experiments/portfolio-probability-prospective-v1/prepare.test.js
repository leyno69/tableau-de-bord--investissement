import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareProspectiveCampaign } from './prepare.mjs';

test('préenregistre la campagne sans fabriquer de prévision ni de résultat', () => {
  const artifact = prepareProspectiveCampaign();
  assert.equal(artifact.status, 'blocked-before-first-forecast');
  assert.deepEqual(artifact.forecasts, []);
  assert.deepEqual(artifact.settlements, []);
  assert.equal(artifact.engineModified, false);
  assert.equal(artifact.protocol.timezone, 'Europe/Paris');
  assert.equal(artifact.calendar.entries.length, 8);
  assert.equal(artifact.sourceReadiness.ready, false);
});

test('conserve explicitement les bloqueurs de données exactes', () => {
  const artifact = prepareProspectiveCampaign();
  assert.ok(artifact.launch.blockers.includes('licensed-data:worldProxy:missing'));
  assert.ok(artifact.launch.blockers.includes('licensed-data:paej:missing'));
  assert.equal(artifact.launch.independentForecastCount, null);
  assert.equal(artifact.launch.mayExposeRealWorldProbability, false);
});
