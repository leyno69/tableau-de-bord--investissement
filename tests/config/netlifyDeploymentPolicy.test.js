import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const strategy = await readFile(
  new URL('../../docs/deployment-strategy.md', import.meta.url),
  'utf8'
);

test('Vercel ne fait plus partie de la configuration du dépôt', async () => {
  await assert.rejects(
    access(new URL('../../vercel.json', import.meta.url), constants.F_OK),
    error => error?.code === 'ENOENT'
  );
});

test('Netlify est la plateforme unique de preview et de production', () => {
  assert.match(strategy, /Netlify comme plateforme unique/i);
  assert.match(strategy, /Deploy Previews pour chaque pull request/i);
  assert.match(strategy, /production depuis `main`/i);
});

test('les règles de fusion ne dépendent plus de Vercel', () => {
  assert.match(strategy, /Aucun contrôle Vercel ne fait partie des critères de fusion/i);
  assert.match(strategy, /CI, les tests métier et Netlify sont au vert/i);
});
