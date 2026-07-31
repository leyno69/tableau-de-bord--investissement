import { pathToFileURL } from 'node:url';

import { Portfolio } from '../domain/portfolio/Portfolio.js';
import { JsonFileInstrumentRepository } from '../infrastructure/instrument/JsonFileInstrumentRepository.js';
import { InMemoryInstrumentRepository } from '../infrastructure/instrument/InMemoryInstrumentRepository.js';
import { openJsonFilePortfolioRepositories } from '../infrastructure/persistence/JsonFilePortfolioRepositories.js';
import { JsonFileMarketQuoteCache } from '../infrastructure/market/JsonFileMarketQuoteCache.js';
import { JsonFileExchangeRateCache } from '../infrastructure/exchange/JsonFileExchangeRateCache.js';
import { loadServerConfig } from './config/loadServerConfig.js';
import { createBootstrapProviders } from './providers/createBootstrapProviders.js';
import { createPortfolioHttpServer } from './server/createPortfolioHttpServer.js';

export async function run({ environment = process.env, logger = console, fetchImplementation = globalThis.fetch } = {}) {
  const config = loadServerConfig(environment);
  const [instrumentRepository, repositories, marketQuoteCache, exchangeRateCache] = await Promise.all([
    createInstrumentRepository(config.instrumentCatalog),
    openJsonFilePortfolioRepositories({ filePath: config.storage.portfolioDataPath }),
    JsonFileMarketQuoteCache.open({ filePath: config.storage.marketQuoteCachePath }),
    JsonFileExchangeRateCache.open({ filePath: config.storage.exchangeRateCachePath })
  ]);

  await ensureDefaultPortfolio(repositories, logger);

  const providers = createBootstrapProviders({
    market: config.market,
    instrumentRepository,
    fetchImplementation
  });
  const runtime = createPortfolioHttpServer({
    config,
    providers,
    repositories,
    marketQuoteCache,
    exchangeRateCache,
    instrumentRepository,
    logger
  });

  let stopping = false;
  const shutdown = async signal => {
    if (stopping) return;
    stopping = true;
    logger.info?.(`Arrêt demandé par ${signal}.`);
    try {
      await runtime.stop();
      process.exitCode = 0;
    } catch (error) {
      logger.error?.('Échec de l’arrêt du serveur.', error);
      process.exitCode = 1;
    }
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  await runtime.start();
  return runtime;
}

async function ensureDefaultPortfolio(repositories, logger) {
  const portfolioRepository = repositories?.portfolios;
  if (!portfolioRepository || typeof portfolioRepository.list !== 'function' || typeof portfolioRepository.save !== 'function') {
    throw new TypeError('Le dépôt persistant de portefeuilles est indisponible.');
  }

  const existing = await portfolioRepository.list();
  if (existing.length > 0) return existing[0];

  const portfolio = new Portfolio({
    id: 'principal',
    name: 'Portefeuille principal',
    baseCurrency: 'EUR',
    status: Portfolio.STATUSES.ACTIVE
  });
  await portfolioRepository.save(portfolio);
  await repositories.flush?.();
  logger.info?.('Portefeuille principal créé automatiquement.');
  return portfolio;
}

async function createInstrumentRepository(config) {
  if (config.repository === 'memory') return new InMemoryInstrumentRepository();
  return JsonFileInstrumentRepository.open({ filePath: config.filePath });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  run().catch(error => {
    console.error('Impossible de démarrer Leynor.', error);
    process.exitCode = 1;
  });
}
