import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('les effets principaux consolidés couvrent tous les niveaux prévus', () => {
  const rows = readFileSync(
    new URL('./docs/methodology/campaigns/factorial-sensitivity-001-results.csv', import.meta.url),
    'utf8'
  ).trim().split('\n');

  assert.equal(rows.length, 20);
  assert.match(rows[0], /factor,level,finalMedian/);
  assert.ok(rows.some((row) => row.startsWith('behavior,interruption,')));
  assert.ok(rows.some((row) => row.startsWith('correlation,0.75,')));
  assert.ok(rows.some((row) => row.startsWith('shockIntensity,7200,')));
});

test('le rapport conserve les garde-fous méthodologiques', () => {
  const report = readFileSync(
    new URL('./docs/methodology/campaigns/FACTORIAL_SENSITIVITY_001_RESULTS.md', import.meta.url),
    'utf8'
  );

  assert.match(report, /720 000 trajectoires/);
  assert.match(report, /ne constituent ni une prévision/i);
  assert.match(report, /Aucune pondération de l'IGL/i);
  assert.match(report, /dispersion relative maximale : 22,33 %/);
});
