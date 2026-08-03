import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../../mobile-ui.js', import.meta.url), 'utf8');
const app = await readFile(new URL('../../app.js', import.meta.url), 'utf8');

test('mobile runtime exposes every navigation destination', () => {
  for (const destination of ['overview', 'portfolio', 'radar', 'goals', 'assistant']) {
    assert.match(source, new RegExp(destination));
  }
  assert.match(source, /nav-item:nth-child\(n\).*display:flex!important/);
});

test('mobile runtime uses deterministic SVG icons instead of font glyphs', () => {
  assert.match(source, /<svg viewBox=/);
  assert.match(source, /nav-icon/);
});

test('dashboard rendering is fail-soft when an optional element is absent', () => {
  assert.match(app, /if \(!select\) continue/);
  assert.match(app, /querySelector\('#refreshBtn'\)\?\.addEventListener/);
  assert.match(app, /if \(!table\) return/);
});

test('mobile runtime audits missing or hidden critical sections', () => {
  assert.match(source, /auditRuntime/);
  assert.match(source, /\.metric-grid/);
  assert.match(source, /\.layout-main/);
  assert.match(source, /Interface incomplète/);
});
