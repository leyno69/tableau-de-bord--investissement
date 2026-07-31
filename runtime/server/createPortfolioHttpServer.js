import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createPortfolioApplication } from '../../application/composition/createPortfolioApplication.js';
import { PortfolioAdminService } from '../../application/admin/PortfolioAdminService.js';
import { InstrumentCatalog } from '../../application/services/InstrumentCatalog.js';
import { InstrumentCatalogImporter } from '../../application/services/InstrumentCatalogImporter.js';
import { LeynorAnalysisPipeline } from '../../application/services/LeynorAnalysisPipeline.js';
import { LeynorAssistantService } from '../../application/services/LeynorAssistantService.js';
import { MarketWeatherService } from '../../application/services/MarketWeatherService.js';
import { HttpLanguageModelProvider } from '../../infrastructure/ai/HttpLanguageModelProvider.js';
import { InMemoryInstrumentRepository } from '../../infrastructure/instrument/InMemoryInstrumentRepository.js';
import { LeynorAnalysisHttpAdapter } from '../../interfaces/http/LeynorAnalysisHttpAdapter.js';
import { LeynorAssistantHttpAdapter } from '../../interfaces/http/LeynorAssistantHttpAdapter.js';
import { PortfolioHttpAdapter } from '../../interfaces/http/PortfolioHttpAdapter.js';
import { InstrumentCatalogHttpAdapter } from '../../interfaces/http/InstrumentCatalogHttpAdapter.js';
import { MarketWeatherHttpAdapter } from '../../interfaces/http/MarketWeatherHttpAdapter.js';
import { createNodeHttpHandler } from '../../interfaces/http/createNodeHttpHandler.js';
import { createSecureHttpHandler } from './createSecureHttpHandler.js';

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const JAVASCRIPT = 'text/javascript; charset=utf-8';
const STATIC_FILES = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', JAVASCRIPT]],
  ['/assistant-ui.js', ['assistant-ui.js', JAVASCRIPT]],
  ['/assistant-memory.js', ['assistant-memory.js', JAVASCRIPT]],
  ['/portfolio-assistant.js', ['portfolio-assistant.js', JAVASCRIPT]],
  ['/brokers.js', ['brokers.js', JAVASCRIPT]],
  ['/portfolio.js', ['portfolio.js', JAVASCRIPT]],
  ['/market.js', ['market.js', JAVASCRIPT]],
  ['/alerts.js', ['alerts.js', JAVASCRIPT]],
  ['/resolver-ui.js', ['resolver-ui.js', JAVASCRIPT]],
  ['/instrument-resolver.js', ['instrument-resolver.js', JAVASCRIPT]],
  ['/backend-ui.js', ['backend-ui.js', JAVASCRIPT]],
  ['/server-sync.js', ['server-sync.js', JAVASCRIPT]],
  ['/ui/PortfolioApiClient.js', ['ui/PortfolioApiClient.js', JAVASCRIPT]],
  ['/application/services/MemoryService.js', ['application/services/MemoryService.js', JAVASCRIPT]],
  ['/infrastructure/memory/LocalStorageUserMemoryRepository.js', ['infrastructure/memory/LocalStorageUserMemoryRepository.js', JAVASCRIPT]],
  ['/infrastructure/memory/LocalStorageConversationMemoryRepository.js', ['infrastructure/memory/LocalStorageConversationMemoryRepository.js', JAVASCRIPT]],
  ['/domain/memory/UserMemory.js', ['domain/memory/UserMemory.js', JAVASCRIPT]],
  ['/domain/memory/ConversationMemory.js', ['domain/memory/ConversationMemory.js', JAVASCRIPT]]
]);

export function createPortfolioHttpServer({
  config,
  providers,
  repositories,
  marketQuoteCache = null,
  exchangeRateCache = null,
  instrumentRepository = new InMemoryInstrumentRepository(),
  alertRules = [],
  clock = () => new Date(),
  idGenerator,
  logger = console,
  fetchImplementation = globalThis.fetch
}) {
  requireConfig(config);
  requireProviders(providers);
  requireLogger(logger);

  const application = createPortfolioApplication({
    ...providers,
    repositories,
    marketQuoteCache,
    exchangeRateCache,
    alertRules,
    clock,
    ...(idGenerator == null ? {} : { idGenerator })
  });
  const adminService = repositories?.portfolios && repositories?.accounts
    ? new PortfolioAdminService({
      facade: application.facade,
      portfolioRepository: repositories.portfolios,
      accountRepository: repositories.accounts
    })
    : null;
  const portfolioAdapter = new PortfolioHttpAdapter({ facade: application.facade, adminService });
  const instrumentCatalog = new InstrumentCatalog({ instrumentRepository });
  const instrumentImporter = new InstrumentCatalogImporter({ instrumentRepository });
  const instrumentAdapter = new InstrumentCatalogHttpAdapter({ catalog: instrumentCatalog, importer: instrumentImporter });
  const marketWeatherService = new MarketWeatherService();
  const marketWeatherAdapter = new MarketWeatherHttpAdapter({ marketWeatherService });
  const leynorAnalysisPipeline = new LeynorAnalysisPipeline({ marketWeatherService });
  const leynorAnalysisAdapter = new LeynorAnalysisHttpAdapter({ pipeline: leynorAnalysisPipeline });
  const languageModelProvider = createLanguageModelProvider(config.languageModel ?? { provider: 'disabled' }, fetchImplementation);
  const leynorAssistantService = languageModelProvider == null
    ? null
    : new LeynorAssistantService({ pipeline: leynorAnalysisPipeline, languageModelProvider });
  const leynorAssistantAdapter = new LeynorAssistantHttpAdapter({ assistantService: leynorAssistantService });
  const httpAdapter = Object.freeze({
    async handle(request) {
      return (await leynorAssistantAdapter.handle(request))
        ?? (await leynorAnalysisAdapter.handle(request))
        ?? (await marketWeatherAdapter.handle(request))
        ?? (await instrumentAdapter.handle(request))
        ?? portfolioAdapter.handle(request);
    }
  });
  const applicationHandler = createNodeHttpHandler({ httpAdapter, maxBodyBytes: config.maxBodyBytes });
  const secureApplicationHandler = createSecureHttpHandler({ handler: applicationHandler, token: config.authToken ?? '', logger, clock });

  let ready = false;
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    if (request.method === 'GET' && pathname === '/health') return sendJson(response, 200, { status: 'ok' });
    if (request.method === 'GET' && pathname === '/ready') return sendJson(response, ready ? 200 : 503, { status: ready ? 'ready' : 'starting' });
    if (request.method === 'GET' && STATIC_FILES.has(pathname)) return sendStaticFile(response, pathname, logger);
    return secureApplicationHandler(request, response);
  });

  async function start() {
    if (server.listening) return address();
    await new Promise((resolve, reject) => {
      const onError = error => { server.off('listening', onListening); reject(error); };
      const onListening = () => { server.off('error', onError); resolve(); };
      server.once('error', onError);
      server.once('listening', onListening);
      server.listen(config.port, config.host);
    });
    ready = true;
    logger.info?.(`Leynor écoute sur http://${address().host}:${address().port}`);
    return address();
  }

  async function stop() {
    ready = false;
    if (server.listening) {
      const timeout = setTimeout(() => server.closeAllConnections?.(), config.shutdownTimeoutMilliseconds);
      timeout.unref?.();
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      clearTimeout(timeout);
    }
    await Promise.all([
      instrumentRepository.flush?.(),
      repositories?.flush?.(),
      marketQuoteCache?.flush?.(),
      exchangeRateCache?.flush?.()
    ].filter(Boolean));
  }

  function address() {
    const value = server.address();
    if (!value || typeof value === 'string') return null;
    return Object.freeze({ host: value.address, port: value.port, family: value.family });
  }

  return Object.freeze({
    server,
    application,
    adminService,
    instrumentCatalog,
    instrumentImporter,
    instrumentRepository,
    marketWeatherService,
    leynorAnalysisPipeline,
    leynorAssistantService,
    languageModelProvider,
    start,
    stop,
    address
  });
}

function createLanguageModelProvider(config = {}, fetchImplementation) {
  if (!config || config.provider == null || config.provider === 'disabled') return null;
  if (config.provider !== 'openai-compatible-http') throw new RangeError('Fournisseur IA LEYNOR non pris en charge.');
  if (!config.apiKey) throw new Error('LEYNOR_LLM_API_KEY est obligatoire lorsque le fournisseur IA est activé.');
  return new HttpLanguageModelProvider({
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    model: config.model,
    timeoutMilliseconds: config.timeoutMilliseconds,
    fetchImplementation
  });
}

async function sendStaticFile(response, pathname, logger) {
  const [relativePath, contentType] = STATIC_FILES.get(pathname);
  try {
    const body = await readFile(join(PROJECT_ROOT, relativePath));
    response.writeHead(200, {
      'content-type': contentType,
      'cache-control': 'no-store, max-age=0',
      'pragma': 'no-cache',
      'expires': '0',
      'x-content-type-options': 'nosniff'
    });
    response.end(body);
  } catch (error) {
    logger.error?.(`Impossible de servir ${relativePath}.`, error);
    sendJson(response, 500, { error: 'static_asset_unavailable' });
  }
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(body));
}
function requireConfig(config) {
  if (!config || typeof config !== 'object') throw new TypeError('config est obligatoire.');
  for (const field of ['host', 'port', 'maxBodyBytes', 'shutdownTimeoutMilliseconds']) if (!(field in config)) throw new TypeError(`config.${field} est obligatoire.`);
}
function requireProviders(providers) {
  if (!providers || typeof providers !== 'object') throw new TypeError('providers est obligatoire.');
  const contracts = [['marketPriceProvider', 'getPrice'], ['exchangeRateProvider', 'getRate'], ['assetClassificationProvider', 'getClassification']];
  for (const [field, method] of contracts) if (!providers[field] || typeof providers[field][method] !== 'function') throw new TypeError(`providers.${field} doit implémenter ${method}().`);
}
function requireLogger(logger) { if (!logger || typeof logger !== 'object') throw new TypeError('logger doit être un objet.'); }
