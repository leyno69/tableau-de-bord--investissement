import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPremiumPdf, createPremiumReport, downloadPremiumPdf } from '../../premium-pdf-export.js';

const report = {
  title: 'Rapport portefeuille LEYNOR AI',
  generatedAt: '2026-08-02',
  methodology: 'Comparaison déterministe de scénarios documentés.',
  sections: [
    { title: 'Résultats', lines: ['Valeur finale médiane : 120 000 EUR', 'Drawdown maximal : 22 %'] },
    { title: 'Confiance et preuve', lines: ['Confiance : moyenne', 'Preuve : provisoire'] }
  ],
  assumptions: ['Rendement hypothétique, non prévisionnel'],
  limitations: ['Les performances passées ne préjugent pas des performances futures']
};

test('le rapport premium est immuable et exige une méthodologie explicite', () => {
  const value = createPremiumReport(report);
  assert.equal(Object.isFrozen(value), true);
  assert.equal(Object.isFrozen(value.sections), true);
  assert.throws(() => createPremiumReport({ ...report, methodology: '' }), /methodology/);
});

test('génère un vrai document PDF avec en-tête, pages et fin de fichier', () => {
  const bytes = buildPremiumPdf(report);
  const text = new TextDecoder().decode(bytes);
  assert.match(text, /^%PDF-1\.4/);
  assert.match(text, /\/Type \/Catalog/);
  assert.match(text, /LEYNOR AI compare des scenarios/);
  assert.match(text, /%%EOF$/);
  assert.ok(bytes.byteLength > 500);
});

test('télécharge le PDF via Blob avec un nettoyage différé compatible mobile', () => {
  let clicked = false;
  let appended = false;
  let removed = false;
  let revoked = null;
  let scheduledDelay = null;
  let cleanup = null;
  let blobType = null;
  const anchor = {
    href: '',
    download: '',
    rel: '',
    hidden: false,
    click() { clicked = true; },
    remove() { removed = true; }
  };
  class FakeBlob {
    constructor(parts, options) {
      this.parts = parts;
      this.type = options.type;
      blobType = this.type;
    }
  }
  const environment = {
    Blob: FakeBlob,
    URL: {
      createObjectURL() { return 'blob:leynor-report'; },
      revokeObjectURL(value) { revoked = value; }
    },
    document: {
      body: { append(value) { assert.equal(value, anchor); appended = true; } },
      createElement(tag) { assert.equal(tag, 'a'); return anchor; }
    },
    setTimeout(callback, delay) {
      cleanup = callback;
      scheduledDelay = delay;
    }
  };

  const result = downloadPremiumPdf(report, 'rapport-portefeuille.pdf', environment);
  assert.equal(clicked, true);
  assert.equal(appended, true);
  assert.equal(anchor.hidden, true);
  assert.equal(anchor.href, 'blob:leynor-report');
  assert.equal(anchor.download, 'rapport-portefeuille.pdf');
  assert.equal(blobType, 'application/pdf');
  assert.equal(scheduledDelay, 1_000);
  assert.equal(revoked, null);
  assert.equal(removed, false);

  cleanup();
  assert.equal(revoked, 'blob:leynor-report');
  assert.equal(removed, true);
  assert.equal(result.mimeType, 'application/pdf');
  assert.ok(result.size > 500);
});

test('refuse un rapport vide au lieu de produire un faux PDF', () => {
  assert.throws(() => buildPremiumPdf({ ...report, sections: [] }), /sections/);
});
