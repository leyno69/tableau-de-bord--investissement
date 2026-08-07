import test from 'node:test';
import assert from 'node:assert/strict';
import { createDualTrackHistoricalPolicy, validateDualTrackResultLabels } from './portfolioHistoricalDualTrackPolicy.js';

test('WPEA long horizon is separated into exact and proxy tracks', () => {
  const policy = createDualTrackHistoricalPolicy({
    protocolId: 'portfolio-historical-v1',
    sourceTicker: 'WPEA',
    exactInstrumentStart: '2024-03-26',
    extendedProxyRequired: true,
    proxyJustification: 'Use issuer benchmark only for pre-inception historical evidence.',
    selectedBeforeOutcomeAccess: true,
    limitationsAccepted: true
  });
  assert.equal(policy.exactTrack.kind, 'exact-instrument');
  assert.equal(policy.proxyTrack.kind, 'benchmark-proxy');
  assert.equal(policy.combineTracks, false);
  assert.equal(policy.combinedInstrumentHistoryAllowed, false);
});

test('proxy results cannot be labelled as exact instrument history', () => {
  const policy = createDualTrackHistoricalPolicy({
    protocolId: 'portfolio-historical-v1', sourceTicker: 'WPEA', exactInstrumentStart: '2024-03-26',
    extendedProxyRequired: true, proxyJustification: 'Issuer benchmark.', selectedBeforeOutcomeAccess: true, limitationsAccepted: true
  });
  assert.throws(() => validateDualTrackResultLabels(policy, [{ track: 'proxy', labelAsExactInstrument: true }]), /historique exact/);
});

test('an instrument with sufficient exact history can remain single-track', () => {
  const policy = createDualTrackHistoricalPolicy({
    protocolId: 'portfolio-historical-v1', sourceTicker: 'NVDA', exactInstrumentStart: '1999-01-22', extendedProxyRequired: false
  });
  assert.equal(policy.proxyTrack, null);
  assert.equal(policy.combineTracks, false);
  assert.equal(validateDualTrackResultLabels(policy, [{ track: 'exact', labelAsExactInstrument: true }]), true);
});
