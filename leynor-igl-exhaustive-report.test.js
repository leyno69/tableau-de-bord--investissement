import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  auditIglReport,
  renderIglExhaustiveReport,
} from './leynor-igl-exhaustive-report.js';

test('génère un rapport déterministe avec total de trajectoires', () => {
  const input = {
    title: 'Rapport IGL',
    version: 'test-1',
    referenceDate: '2026-08-02',
    status: 'expérimental',
    principles: ['Aucun poids manuel.'],
    campaigns: [
      { id: '1', title: 'Pilote', trajectories: 100, status: 'terminée' },
      { id: '2', title: 'Validation', trajectories: 200, status: 'terminée' },
    ],
    findings: ['Résultat synthétique.'],
    components: [
      { name: 'Résilience', status: 'candidate', rationale: 'Validation requise.' },
    ],
    validation: ['Validation indépendante requise.'],
    limitations: ['Limites explicites.'],
    decisions: ['Aucun poids et aucun IGL de production.'],
    nextSteps: ['Nouvelle campagne indépendante.'],
    conclusion: 'Aucun IGL de production.',
  };
  const first = renderIglExhaustiveReport(input);
  const second = renderIglExhaustiveReport(input);
  assert.equal(first, second);
  assert.match(first, /300 trajectoires/);
  assert.match(first, /Aucun poids/);
});

test('audite les avertissements indispensables', () => {
  const complete = auditIglReport([
    'ne constitue ni une prévision',
    'aucun poids',
    'IGL de production',
    'limites',
  ].join('\n'));
  assert.equal(complete.complete, true);

  const incomplete = auditIglReport('rapport sans avertissements');
  assert.equal(incomplete.complete, false);
  assert.ok(incomplete.missing.length > 0);
});

test('le rapport exhaustif versionné conserve les garde-fous', async () => {
  const report = await readFile(
    new URL('./docs/methodology/igl/RAPPORT_EXHAUSTIF_IGL.md', import.meta.url),
    'utf8',
  );
  const audit = auditIglReport(report);
  assert.equal(audit.complete, true, `mentions manquantes: ${audit.missing.join(', ')}`);
  assert.match(report, /2 386 000 trajectoires/);
  assert.match(report, /IGL reste expérimental/);
  assert.match(report, /aucun IGL de production activé/i);
});

test('rejette un inventaire de campagne invalide', () => {
  assert.throws(() => renderIglExhaustiveReport({
    title: 'Rapport',
    version: '1',
    principles: [],
    campaigns: [{ id: '1', title: 'Test', trajectories: -1 }],
    findings: [],
    components: [],
    limitations: [],
    decisions: [],
    nextSteps: [],
    conclusion: 'Aucun IGL de production.',
  }), /campaign/);
});
