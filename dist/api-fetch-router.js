import { apiUrl, getApiBaseUrl } from './api-connection.js';

const BACKEND_PATHS = Object.freeze([
  '/health',
  '/ready',
  '/portfolios',
  '/leynor/'
]);

function backendPath(input) {
  const raw = input instanceof Request ? input.url : String(input || '');
  const url = new URL(raw, document.baseURI);
  const sameOrigin = url.origin === window.location.origin;
  if (!sameOrigin) return null;
  const basePath = new URL(document.baseURI).pathname.replace(/[^/]*$/, '');
  const relativePath = url.pathname.startsWith(basePath) ? `/${url.pathname.slice(basePath.length)}` : url.pathname;
  return BACKEND_PATHS.some(path => relativePath === path || relativePath.startsWith(path)) ? `${relativePath}${url.search}` : null;
}

function installApiFetchRouter(target = window) {
  if (target.fetch.__leynorApiRouter) return;
  const nativeFetch = target.fetch.bind(target);
  const routedFetch = (input, init) => {
    const path = backendPath(input);
    if (!path) return nativeFetch(input, init);
    if (!getApiBaseUrl()) return Promise.reject(new Error('Serveur LEYNOR non configuré. Touchez « Connexion serveur » puis renseignez son adresse publique.'));
    const destination = apiUrl(path);
    if (input instanceof Request) return nativeFetch(new Request(destination, input), init);
    return nativeFetch(destination, init);
  };
  routedFetch.__leynorApiRouter = true;
  target.fetch = routedFetch;
}

installApiFetchRouter();
export { BACKEND_PATHS, backendPath, installApiFetchRouter };
