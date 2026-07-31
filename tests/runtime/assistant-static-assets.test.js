import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../../runtime/server/createPortfolioHttpServer.js', import.meta.url), 'utf8');

const requiredAssets = [
  '/assistant-ui.js',
  '/assistant-memory.js',
  '/portfolio-assistant.js',
  '/application/services/MemoryService.js',
  '/infrastructure/memory/LocalStorageUserMemoryRepository.js',
  '/infrastructure/memory/LocalStorageConversationMemoryRepository.js',
  '/domain/memory/UserMemory.js',
  '/domain/memory/ConversationMemory.js'
];

test('Railway sert tout le graphe de modules utilisé par l’assistant web', () => {
  for (const asset of requiredAssets) assert.match(server, new RegExp(asset.replaceAll('/', '\\/')));
});

test('les modules JavaScript sont servis avec un type MIME compatible avec les imports ES', () => {
  assert.match(server, /const JAVASCRIPT = 'text\/javascript; charset=utf-8'/);
  assert.match(server, /\['\/assistant-ui\.js', \['assistant-ui\.js', JAVASCRIPT\]\]/);
});
