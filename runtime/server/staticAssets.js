import { STATIC_BETA_ASSETS } from './staticBetaAssets.js';

const JAVASCRIPT = 'text/javascript; charset=utf-8';
const CSS = 'text/css; charset=utf-8';
const HTML = 'text/html; charset=utf-8';

const CORE_ASSETS = Object.freeze([
  ['index.html', HTML],
  ['offline.html', HTML],
  ['style.css', CSS],
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

const PWA_SHELL_ASSETS = Object.freeze([
  ['refresh-policy.js', JAVASCRIPT],
  ['asset-details.css', CSS],
  ['broker-import.js', JAVASCRIPT],
  ['broker-import-core.js', JAVASCRIPT],
  ['broker-import.css', CSS],
  ['broker-import-guide.js', JAVASCRIPT],
  ['broker-import-guide.css', CSS],
  ['trends.html', HTML],
  ['market-trends.js', JAVASCRIPT],
  ['probability-assessment.js', JAVASCRIPT],
  ['trading.html', HTML],
  ['speculative-radar.js', JAVASCRIPT],
  ['opportunity-radar.js', JAVASCRIPT],
  ['simulator.html', HTML],
  ['simulator-ui.js', JAVASCRIPT],
  ['simulation-presets.js', JAVASCRIPT],
  ['simulation-preset-insights-ui.js', JAVASCRIPT],
  ['portfolio-simulator.js', JAVASCRIPT],
  ['leynor-logo.css', CSS],
  ['leynor-assistant.css', CSS],
  ['icons/leynor-laboratory-premium.svg', 'image/svg+xml']
]);

function normalizeAsset([path, contentType]) {
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return [`/${normalized}`, [normalized, contentType]];
}

export const STATIC_FILES = new Map([
  ['/', ['index.html', HTML]],
  ...CORE_ASSETS.map(normalizeAsset),
  ...PWA_SHELL_ASSETS.map(normalizeAsset),
  ...STATIC_BETA_ASSETS.map(normalizeAsset)
]);

export function listStaticAssetPaths() {
  return [...STATIC_FILES.keys()].filter(path => path !== '/');
}
