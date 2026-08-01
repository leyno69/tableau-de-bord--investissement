import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { parseBrokerPdfText, PDF_IMPORT_ENGINE } from '../../broker-pdf-import.js';

test('parse un achat depuis le texte extrait d’un relevé PDF', () => {
  const rows = parseBrokerPdfText(`01/08/2026\nAchat\nInstrument: Amundi MSCI World\nISIN: IE0002XZSHO1\nQuantité: 2\nPrix unitaire: 5,50 EUR\nFrais: 1,00 EUR`, { broker: 'trade-republic', fileName: 'releve.pdf' });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].operation, 'buy');
  assert.equal(rows[0].date, '2026-08-01');
  assert.equal(rows[0].isin, 'IE0002XZSHO1');
  assert.equal(rows[0].quantity, 2);
  assert.equal(rows[0].avgPrice, 5.5);
  assert.equal(rows[0].fees, 1);
  assert.equal(rows[0].status.level, 'ok');
});

test('calcule le prix unitaire depuis le montant total', () => {
  const rows = parseBrokerPdfText(`15.07.2026 Vente Instrument: Exemple Action Ticker: TEST Quantité: 4 Montant total: 100,00 EUR`, { broker: 'generic', fileName: 'export.pdf' });
  assert.equal(rows[0].operation, 'sell');
  assert.equal(rows[0].avgPrice, 25);
});

test('signale une opération PDF incomplète sans l’autoriser', () => {
  const rows = parseBrokerPdfText(`02/08/2026 Achat Instrument: Actif incomplet`, { broker: 'generic', fileName: 'incomplet.pdf' });
  assert.equal(rows[0].status.level, 'error');
  assert.match(rows[0].status.messages.join(' '), /quantité absente/);
  assert.match(rows[0].status.messages.join(' '), /prix absent/);
});

test('l’interface branche le moteur PDF et explique la limite des documents scannés', async () => {
  const source = await fs.readFile(new URL('../../broker-import.js', import.meta.url), 'utf8');
  assert.match(source, /parseBrokerPdf/);
  assert.match(source, /PDF scannés sans couche texte/);
  assert.match(source, /Vérifiez chaque ligne avant validation/);
  assert.equal(PDF_IMPORT_ENGINE.name, 'Mozilla PDF.js');
});
