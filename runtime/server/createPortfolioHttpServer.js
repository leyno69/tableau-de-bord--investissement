import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createPortfolioApplication } from '../../application/composition/createPortfolioApplication.js';
import { PortfolioAdminService } from '../../application/admin/PortfolioAdminService.js';
import { InstrumentCatalog } from '../../application/services/InstrumentCatalog.js';
import { InstrumentCatalogImporter } from '../../application/services/InstrumentCatalogImporter.js';
import { InMemoryInstrumentRepository } from '../../infrastructure/instrument/InMemoryInstrumentRepository.js';
import { PortfolioHttpAdapter } from '../../interfaces/http/PortfolioHttpAdapter.js';
import { InstrumentCatalogHttpAdapter } from '../../interfaces/http/InstrumentCatalogHttpAdapter.js';
import { createNodeHttpHandler } from '../../interfaces/http/createNodeHttpHandler.js';
import { createSecureHttpHandler } from './createSecureHttpHandler.js';

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const STATIC_FILES = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/brokers.js', ['brokers.js', 'text/javascript; charset=utf-8']],
  ['/portfolio.js', ['portfolio.js', 'text/javascript; charset=utf-8']],
  ['/market.js', ['market.js', 'text/javascript; charset=utf-8']],
  ['/alerts.js', ['alerts.js', 'text/javascript; charset=utf-8']],
  ['/resolver-ui.js', ['resolver-ui.js', 'text/javascript; charset=utf-8']]
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
  logger = console
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
  const httpAdapter = Object.freeze({
    async handle(request) { return (await instrumentAdapter.handle(request)) ?? portfolioAdapter.handle(request); }
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

  return Object.freeze({ server, application, adminService, instrumentCatalog, instrumentImporter, instrumentRepository, start, stop, address });
}

async function sendStaticFile(response, pathname, logger) {
  const [relativePath, contentType] = STATIC_FILES.get(pathname);
  try {
    const body = await readFile(join(PROJECT_ROOT, relativePath));
    response.writeHead(200, {
      'content-type': contentType,
      'cache-control': pathname === '/' || pathname === '/index.html' ? 'no-cache' : 'public, max-age=300',
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
