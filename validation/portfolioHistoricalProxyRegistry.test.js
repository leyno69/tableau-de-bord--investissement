import test from 'node:test';
import assert from 'node:assert/strict';
import { approveHistoricalProxy, findHistoricalProxyCandidates } from './portfolioHistoricalProxyRegistry.js';

test('WPEA propose uniquement son indice de référence officiel comme proxy candidat', () => {
  const candidates = findHistoricalProxyCandidates('WPEA');
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].benchmark, 'MSCI World Index');
  assert.equal(candidates[0].returnBasis, 'net-total-return');
});

test('PAEJ conserve la base de rendement et la devise officielles', () => {
  const [candidate] = findHistoricalProxyCandidates('PAEJ');
  assert.equal(candidate.benchmark, 'MSCI Daily TR Net AC Asia Pacific Ex Japan USD');
  assert.equal(candidate.currency, 'USD');
  assert.ok(candidate.limitations.includes('currency-conversion-required-for-eur-portfolio'));
});

test('les deux identités SMH restent séparées', () => {
  const [us] = findHistoricalProxyCandidates('SMH-US');
  const [eu] = findHistoricalProxyCandidates('SMH-EU');
  assert.notEqual(us.benchmark, eu.benchmark);
  assert.ok(eu.limitations.includes('screening-methodology-differs-from-us-smh'));
});

test('un proxy ne peut être approuvé après ouverture des résultats', () => {
  const [candidate] = findHistoricalProxyCandidates('WPEA');
  assert.throws(() => approveHistoricalProxy(candidate, {
    protocolId: 'portfolio-historical-v1',
    justification: 'Étendre la profondeur temporelle avec le benchmark officiel.',
    selectedBeforeOutcomeAccess: false,
    limitationsAccepted: true
  }), /selectedBeforeOutcomeAccess/);
});

test('une approbation conserve les limites et le protocole', () => {
  const [candidate] = findHistoricalProxyCandidates('WPEA');
  const approved = approveHistoricalProxy(candidate, {
    protocolId: 'portfolio-historical-v1',
    justification: 'Benchmark officiel de l’émetteur, utilisé uniquement comme proxy déclaré.',
    selectedBeforeOutcomeAccess: true,
    limitationsAccepted: true
  });
  assert.equal(approved.status, 'approved-for-protocol');
  assert.equal(approved.protocolId, 'portfolio-historical-v1');
  assert.ok(approved.limitations.length > 0);
});
