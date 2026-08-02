import test from 'node:test';
import assert from 'node:assert/strict';

import { createPortfolioPremiumReport } from '../../premium-portfolio-report.js';
import { buildPremiumPdf } from '../../premium-pdf-export.js';

const input = {
  generatedAt: '2026-08-02',
  currency: 'EUR',
  cash: 1000,
  positions: [
    { name: 'ETF Monde', symbol: 'WORLD', quantity: 10, marketValue: 6000, assetType: 'ETF' },
    { name: 'Action Exemple', symbol: 'EXM', quantity: 5, marketValue: 3000, assetType: 'Action' }
  ]
};

test('construit un rapport portefeuille déterministe et immuable', () => {
  const report = createPortfolioPremiumReport(input);
  assert.equal(Object.isFrozen(report), true);
  assert.equal(report.title, 'Rapport portefeuille LEYNOR AI');
  assert.match(report.sections[0].lines[0], /10.?000/);
  assert.match(report.sections[0].lines[3], /2/);
  assert.match(report.sections[0].lines[4], /60\.0 %/);
});

test('ordonne les positions par valeur et calcule leur poids sans inventer de score', () => {
  const report = createPortfolioPremiumReport(input);
  assert.match(report.sections[1].lines[0], /ETF Monde/);
  assert.match(report.sections[1].lines[0], /60\.0 %/);
  assert.doesNotMatch(JSON.stringify(report), /score LEYNOR/i);
});

test('signale factuellement une concentration supérieure ou égale à 50 %', () => {
  const report = createPortfolioPremiumReport(input);
  assert.match(report.sections[2].lines[0], /Concentration élevée/);
  assert.match(report.sections[2].lines[1], /ne constitue pas une recommandation/);
});

test('produit un PDF réel à partir du rapport portefeuille', () => {
  const bytes = buildPremiumPdf(createPortfolioPremiumReport(input));
  const text = new TextDecoder().decode(bytes);
  assert.match(text, /^%PDF-1\.4/);
  assert.match(text, /Rapport portefeuille LEYNOR AI/);
  assert.match(text, /%%EOF$/);
});

test('refuse les portefeuilles vides, négatifs ou incohérents', () => {
  assert.throws(() => createPortfolioPremiumReport({ ...input, positions: [] }), /positions/);
  assert.throws(() => createPortfolioPremiumReport({ ...input, cash: -1 }), /cash/);
  assert.throws(() => createPortfolioPremiumReport({ ...input, positions: [{ ...input.positions[0], marketValue: -1 }] }), /négative/);
});
