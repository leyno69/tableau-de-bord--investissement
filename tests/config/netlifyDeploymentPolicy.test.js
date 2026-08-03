import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const strategy = await readFile(
  new URL('../../docs/deployment-strategy.md', import.meta.url),
  'utf8'
);
const railway = JSON.parse(
  await readFile(new URL('../../railway.json', import.meta.url), 'utf8')
);
const vercel = JSON.parse(
  await readFile(new URL('../../vercel.json', import.meta.url), 'utf8')
);
const packageJson = JSON.parse(
  await readFile(new URL('../../package.json', import.meta.url), 'utf8')
);

test('Vercel publie le frontend statique généré', () => {
  assert.equal(vercel.buildCommand, 'npm run build');
  assert.equal(vercel.outputDirectory, 'dist');
  assert.equal(packageJson.scripts?.build, 'node scripts/build-static-site.js');
});

test('Railway reste le backend persistant de production', () => {
  assert.match(strategy, /Vercel publie le frontend/i);
  assert.match(strategy, /Railway conserve le serveur Node\.js/i);
  assert.match(strategy, /branche de production `main`|branche : `main`/i);
});

test('la production Railway utilise le Dockerfile et un healthcheck explicite', () => {
  assert.equal(railway.build?.builder, 'DOCKERFILE');
  assert.equal(railway.build?.dockerfilePath, 'Dockerfile');
  assert.equal(railway.deploy?.healthcheckPath, '/ready');
  assert.equal(railway.deploy?.restartPolicyType, 'ON_FAILURE');
});

test('le proxy sécurisé conserve le jeton hors du navigateur', () => {
  assert.match(strategy, /LEYNOR_BACKEND_URL/);
  assert.match(strategy, /LEYNOR_BACKEND_TOKEN/);
  assert.match(strategy, /n’est pas exposé au navigateur/i);
});
