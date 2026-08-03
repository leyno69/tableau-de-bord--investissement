import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const strategy = await readFile(
  new URL('../../docs/deployment-strategy.md', import.meta.url),
  'utf8'
);
const railway = JSON.parse(
  await readFile(new URL('../../railway.json', import.meta.url), 'utf8')
);

test('Vercel ne fait plus partie de la configuration du dépôt', async () => {
  await assert.rejects(
    access(new URL('../../vercel.json', import.meta.url), constants.F_OK),
    error => error?.code === 'ENOENT'
  );
});

test('Railway est la plateforme unique de production', () => {
  assert.match(strategy, /Railway comme plateforme unique de production/i);
  assert.match(strategy, /branche de production : `main`/i);
  assert.match(strategy, /frontend et API issus du même commit/i);
});

test('la production Railway utilise le Dockerfile et un healthcheck explicite', () => {
  assert.equal(railway.build?.builder, 'DOCKERFILE');
  assert.equal(railway.build?.dockerfilePath, 'Dockerfile');
  assert.equal(railway.deploy?.healthcheckPath, '/ready');
  assert.equal(railway.deploy?.restartPolicyType, 'ON_FAILURE');
});

test('les règles de fusion ne dépendent d’aucun hébergeur externe', () => {
  assert.match(strategy, /contrôles GitHub Actions requis sont au vert/i);
  assert.match(strategy, /Aucun contrôle Vercel, Netlify ou Railway de preview n'est obligatoire/i);
});
