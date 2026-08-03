import test from 'node:test';
import assert from 'node:assert/strict';
import { auditInteractions, REQUIRED_CONTROLS } from '../../interaction-audit.js';

function fakeDocument({ missing = new Set(), wrongTags = new Map(), links = [] } = {}) {
  return {
    getElementById(id) {
      if (missing.has(id)) return null;
      const expected = REQUIRED_CONTROLS.find(([key]) => key === id)?.[1] || 'section';
      return { tagName: (wrongTags.get(id) || expected).toUpperCase() };
    },
    querySelectorAll() {
      return links.map(target => ({ getAttribute: () => `#${target}` }));
    }
  };
}

test('déclare saine une interface contenant les contrôles requis', () => {
  const result = auditInteractions(fakeDocument());
  assert.equal(result.healthy, true);
  assert.deepEqual(result.issues, []);
});

test('détecte les contrôles absents et les mauvaises balises', () => {
  const result = auditInteractions(fakeDocument({
    missing: new Set(['refreshBtn']),
    wrongTags: new Map([['brokerSelect', 'div']])
  }));
  assert.equal(result.healthy, false);
  assert.ok(result.issues.includes('missing:refreshBtn'));
  assert.ok(result.issues.includes('invalid-tag:brokerSelect'));
});

test('détecte une destination de navigation absente', () => {
  const documentRef = fakeDocument({ links: ['section-inconnue'] });
  const original = documentRef.getElementById;
  documentRef.getElementById = id => id === 'section-inconnue' ? null : original(id);
  const result = auditInteractions(documentRef);
  assert.ok(result.issues.includes('missing-target:section-inconnue'));
});
