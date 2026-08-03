import { STATIC_BETA_ASSETS } from './staticBetaAssets.js';

const JAVASCRIPT = 'text/javascript; charset=utf-8';

const CORE_ASSETS = Object.freeze([
  ['index.html', 'text/html; charset=utf-8'],
  ['style.css', 'text/css; charset=utf-8'],
  ['app.js', JAVASCRIPT],
  ['assistant-ui.js', JAVASCRIPT],
  ['assistant-memory.js', JAVASCRIPT],
  ['portfolio-assistant.js', JAVASCRIPT],
  ['brokers.js', JAVASCRIPT],
  ['portfolio.js', JAVASCRIPT],
  ['market.js', JAVASCRIPT],
  ['alerts.js', JAVASCRIPT],
  ['resolver-ui.js', JAVASCRIPT],
  ['instrument-resolver.js', JAVASCRIPT],
  ['backend-ui.js', JAVASCRIPT],
  ['server-sync.js', JAVASCRIPT],
  ['ui/PortfolioApiClient.js', JAVASCRIPT],
  ['application/services/MemoryService.js', JAVASCRIPT],
  ['infrastructure/memory/LocalStorageUserMemoryRepository.js', JAVASCRIPT],
  ['infrastructure/memory/LocalStorageConversationMemoryRepository.js', JAVASCRIPT],
  ['domain/memory/UserMemory.js', JAVASCRIPT],
  ['domain/memory/ConversationMemory.js', JAVASCRIPT]
]);

function normalizeAsset([path, contentType]) {
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return [`/${normalized}`, [normalized, contentType]];
}

export const STATIC_FILES = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ...CORE_ASSETS.map(normalizeAsset),
  ...STATIC_BETA_ASSETS.map(normalizeAsset)
]);

export function listStaticAssetPaths() {
  return [...STATIC_FILES.keys()].filter(path => path !== '/');
}
