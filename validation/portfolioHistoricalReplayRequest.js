import { runHistoricalReplay } from './portfolioHistoricalReplayEngine.js';

function nonEmpty(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`);
  return value.trim();
}

export function validateReplayDatasetBindings({ purpose, track, tickers, datasetManifests }) {
  const normalizedPurpose = nonEmpty(purpose, 'purpose');
  const normalizedTrack = nonEmpty(track, 'track');
  if (!['fixture','development','empirical-validation'].includes(normalizedPurpose)) throw new TypeError('purpose invalide.');
  if (!['exact','proxy'].includes(normalizedTrack)) throw new TypeError('track invalide.');
  if (!Array.isArray(tickers) || tickers.length === 0) throw new TypeError('tickers doit être un tableau non vide.');
  if (!datasetManifests || typeof datasetManifests !== 'object' || Array.isArray(datasetManifests)) throw new TypeError('datasetManifests doit être un objet.');

  const bindings = tickers.map(rawTicker => {
    const ticker = nonEmpty(rawTicker, 'ticker').toUpperCase();
    const manifest = datasetManifests[ticker];
    if (!manifest) throw new TypeError(`manifeste absent pour ${ticker}.`);
    if (manifest.track !== normalizedTrack) throw new TypeError(`track du manifeste incompatible pour ${ticker}.`);
    if (manifest.usage !== normalizedPurpose) throw new TypeError(`usage du manifeste incompatible pour ${ticker}: ${manifest.usage}.`);
    if (normalizedPurpose === 'empirical-validation' && manifest.validationEligibleSource !== true) {
      throw new TypeError(`source non validation-eligible pour ${ticker}.`);
    }
    return Object.freeze({ ticker, datasetId: manifest.datasetId, manifestFingerprint: manifest.manifestFingerprint });
  });
  return Object.freeze(bindings);
}

export function runManifestedHistoricalReplay(input) {
  if (!input || typeof input !== 'object') throw new TypeError('input doit être un objet.');
  const tickers = input.allocation?.map(item => String(item.ticker ?? '').trim().toUpperCase()) ?? [];
  const datasetBindings = validateReplayDatasetBindings({
    purpose: input.purpose,
    track: input.track,
    tickers,
    datasetManifests: input.datasetManifests
  });
  const replay = runHistoricalReplay(input);
  return Object.freeze({ ...replay, purpose: input.purpose, track: input.track, datasetBindings });
}
