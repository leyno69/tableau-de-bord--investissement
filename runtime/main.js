import { pathToFileURL } from 'node:url';

import { JsonFileInstrumentRepository } from '../infrastructure/instrument/JsonFileInstrumentRepository.js';
import { InMemoryInstrumentRepository } from '../infrastructure/instrument/InMemoryInstrumentRepository.js';
import { loadServerConfig } from './config/loadServerConfig.js';
import { createBootstrapProviders } from './providers/createBootstrapProviders.js';
import { createPortfolioHttpServer } from './server/createPortfolioHttpServer.js';

export async function run({ environment = process.env, logger = console, fetchImplementation = globalThis.fetch } = {}) {
  const config = loadServerConfig(environment);
  const instrumentRepository = await createInstrumentRepository(config.instrumentCatalog);
  const providers = createBootstrapProviders({
    market: config.market,
    instrumentRepository,
    fetchImplementation
  });
  const runtime = createPortfolioHttpServer({
    config,
    providers,
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
