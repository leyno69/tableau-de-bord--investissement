import test from 'node:test';
import assert from 'node:assert/strict';
import { eodhdInstrumentCoverageEvidenceV1, findEodhdCoverageEvidence } from './portfolioHistoricalCoverageEvidence.js';

test('la couverture EODHD est enregistrée pour les instruments identifiés et les deux variantes SMH', () => {
  assert.equal(eodhdInstrumentCoverageEvidenceV1.length, 5);
  assert.equal(findEodhdCoverageEvidence('WPEA')?.providerSymbol, 'WPEA.PA');
  assert.equal(findEodhdCoverageEvidence('PAEJ')?.providerSymbol, 'PAEJ.PA');
  assert.equal(findEodhdCoverageEvidence('NVDA')?.providerSymbol, 'NVDA.US');
  assert.equal(findEodhdCoverageEvidence('SMH-US')?.providerSymbol, 'SMH.US');
  assert.equal(findEodhdCoverageEvidence('SMH-EU')?.providerSymbol, 'SMH.PA');
});

test('la couverture d’un symbole inconnu n’est jamais inventée', () => {
  assert.equal(findEodhdCoverageEvidence('UNKNOWN'), null);
});
