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

test('reconnaît les libellés anglais et les dates ISO', () => {
  const rows = parseBrokerPdfText(`2026-08-01 Purchase Security: Example ETF Symbol: EXMPL Shares: 3 Execution price: 12.50 USD Brokerage: 0.50 USD`, { broker: 'interactive-brokers', fileName: 'statement.pdf' });
  assert.equal(rows[0].operation, 'buy');
  assert.equal(rows[0].date, '2026-08-01');
  assert.equal(rows[0].ticker, 'EXMPL');
  assert.equal(rows[0].quantity, 3);
  assert.equal(rows[0].avgPrice, 12.5);
  assert.equal(rows[0].fees, 0.5);
  assert.equal(rows[0].currency, 'USD');
});

test('importe un solde espèces explicite', () => {
  const rows = parseBrokerPdfText(`01/08/2026 Solde espèces: 742,30 EUR`, { broker: 'generic', fileName: 'cash.pdf' });
  assert.equal(rows[0].operation, 'cash');
  assert.equal(rows[0].cash, 742.3);
  assert.equal(rows[0].status.level, 'ok');
});

test('signale une opération PDF incomplète sans l’autoriser', () => {
  const rows = parseBrokerPdfText(`02/08/2026 Achat Instrument: Actif incomplet`, { broker: 'generic', fileName: 'incomplet.pdf' });
  assert.equal(rows[0].status.level, 'error');
  assert.match(rows[0].status.messages.join(' '), /quantité absente/);
  assert.match(rows[0].status.messages.join(' '), /prix absent/);
});

test('l’interface branche le moteur PDF et son fallback OCR local', async () => {
  const source = await fs.readFile(new URL('../../broker-import.js', import.meta.url), 'utf8');
  assert.match(source, /parseBrokerPdf/);
  assert.match(source, /PDF scannés/);
  assert.match(source, /Vérifiez chaque ligne avant validation/);
  assert.equal(PDF_IMPORT_ENGINE.name, 'Mozilla PDF.js + OCR local');
  assert.equal(PDF_IMPORT_ENGINE.ocr, true);
});
