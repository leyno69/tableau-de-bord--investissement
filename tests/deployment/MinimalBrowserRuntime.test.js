import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const buildScript = await readFile(new URL('../../scripts/build-static-site.js', import.meta.url), 'utf8');

test('le build Vercel désactive les modules secondaires instables', () => {
  for (const script of ['resolver-ui.js', 'assistant-ui.js', 'server-sync.js', 'broker-import.js', 'home-recovery.js']) {
    assert.match(buildScript, new RegExp(script.replace('.', '\\.')));
  }
  assert.match(buildScript, /app\.js/);
});
