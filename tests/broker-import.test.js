import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDelimited, normalizeBrokerRows, detectDuplicates, buildPortfolioPatch } from '../broker-import-core.js';

test('parse et normalise un export CSV francophone', () => {
  const csv = 'Date;Operation;Name;Ticker;ISIN;Quantity;Avg Price;Currency;Fees\n01/08/2026;Achat;ETF Monde;WPEA;IE0002XZSHO1;2;5,50;EUR;1,00';
  const parsed = parseDelimited(csv);
  const [row] = normalizeBrokerRows(parsed.rows, { broker: 'trade-republic', fileName: 'export.csv' });
  assert.equal(parsed.delimiter, ';');
  assert.equal(row.operation, 'buy');
  assert.equal(row.quantity, 2);
  assert.equal(row.avgPrice, 5.5);
  assert.equal(row.date, '2026-08-01');
  assert.equal(row.status.level, 'ok');
});

test('détecte un doublon de manière déterministe', () => {
  const parsed = parseDelimited('Date,Operation,Name,Ticker,Quantity,Avg Price\n2026-08-01,Buy,NVIDIA,NVDA,1,100');
  const [row] = normalizeBrokerRows(parsed.rows, { broker: 'trade-republic', fileName: 'one.csv' });
  const [duplicate] = detectDuplicates([row], [row.id]);
  assert.equal(duplicate.duplicate, true);
});

test('applique achats, ventes et solde espèces sans dupliquer les positions', () => {
  const rows = normalizeBrokerRows(parseDelimited([
    'Date;Operation;Name;Ticker;ISIN;Quantity;Avg Price;Cash',
    '01/08/2026;Achat;ETF Monde;WPEA;IE0002XZSHO1;2;5,00;',
    '02/08/2026;Achat;ETF Monde;WPEA;IE0002XZSHO1;1;8,00;',
    '03/08/2026;Vente;ETF Monde;WPEA;IE0002XZSHO1;1;9,00;',
    '03/08/2026;Solde espèces;;;;;;7,42'
  ].join('\n')).rows, { broker: 'trade-republic' });
  const result = buildPortfolioPatch(rows, { cash: 0, positions: [] });
  assert.equal(result.portfolio.positions.length, 1);
  assert.equal(result.portfolio.positions[0].quantity, 2);
  assert.equal(result.portfolio.cash, 7.42);
  assert.equal(result.applied.length, 4);
});

test('ignore les lignes invalides', () => {
  const rows = normalizeBrokerRows(parseDelimited('Operation;Name;Ticker;Quantity;Avg Price\nAchat;ETF Monde;WPEA;;5').rows);
  const result = buildPortfolioPatch(rows, { cash: 0, positions: [] });
  assert.equal(result.portfolio.positions.length, 0);
  assert.equal(result.skipped.length, 1);
});
