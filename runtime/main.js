import { pathToFileURL } from 'node:url';

import { loadServerConfig } from './config/loadServerConfig.js';
import { createBootstrapProviders } from './providers/createBootstrapProviders.js';
import { createPortfolioHttpServer } from './server/createPortfolioHttpServer.js';

export async function run({ environment = process.env, logger = console, fetchImplementation = globalThis.fetch } = {}) {
  const config = loadServerConfig(environment);
  const runtime = createPortfolioHttpServer({
    config,
    providers: createBootstrapProviders({ market: config.market, fetchImplementation }),
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

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  run().catch(error => {
    console.error('Impossible de démarrer Leynor.', error);
    process.exitCode = 1;
  });
}
