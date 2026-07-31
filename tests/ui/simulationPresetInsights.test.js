import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../../simulator.html', import.meta.url), 'utf8');
const ui = await readFile(new URL('../../simulation-preset-insights-ui.js', import.meta.url), 'utf8');
const worker = await readFile(new URL('../../service-worker.js', import.meta.url), 'utf8');

test('simulation page loads explanatory preset insights', () => {
  assert.match(html, /simulation-preset-insights-ui\.js/);
  assert.match(ui, /riskLabel/);
  assert.match(ui, /horizonYears/);
  assert.match(ui, /allocation/);
  assert.match(ui, /annualReturn/);
  assert.match(ui, /annualVolatility/);
});

test('preset insights remain available offline', () => {
  assert.match(worker, /leynor-shell-v6/);
  assert.match(worker, /'\/simulation-preset-insights-ui\.js'/);
});
