import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const config = JSON.parse(
  await readFile(new URL('../../vercel.json', import.meta.url), 'utf8')
);

test('Vercel ne déploie automatiquement que la branche main', () => {
  assert.equal(config.$schema, 'https://openapi.vercel.sh/vercel.json');
  assert.deepEqual(config.git?.deploymentEnabled, {
    '*': false,
    main: true
  });
});

test('aucune branche de développement connue ne peut déclencher un déploiement', () => {
  for (const branch of [
    'feature/example',
    'fix/example',
    'hotfix/example',
    'vague6-example',
    'sprint-a5/example'
  ]) {
    assert.equal(config.git.deploymentEnabled[branch] ?? config.git.deploymentEnabled['*'], false);
  }
});
