import { mkdir, readFile, writeFile } from 'node:fs/promises';
import {
  prepareAcceleratedHistoricalValueOpen,
  verifyAndOpenAcceleratedHistoricalValueSet
} from '../../validation/portfolioAcceleratedHistoricalValueGate.js';

export const METADATA_SEAL_ARTIFACT_PATH = 'artifacts/portfolio-probability-accelerated-historical-v1-metadata-seal.json';
export const LICENSED_MANIFEST_PATHS = Object.freeze({
  paej: 'data/licensed-validation/paej.manifest.json',
  worldProxy: 'data/licensed-validation/worldProxy.manifest.json'
});
export const LICENSED_VALUE_PATHS = Object.freeze({
  paej: 'data/licensed-validation/paej.csv',
  worldProxy: 'data/licensed-validation/worldProxy.csv'
});
export const LICENSED_INPUT_EVIDENCE_PATH = 'artifacts/portfolio-probability-accelerated-historical-v1-licensed-input-evidence.json';

async function readJson(readData, path) {
  const text = await readData(path, 'utf8');
  return JSON.parse(text);
}

export async function loadAcceleratedHistoricalLicensedInputs({ readData = readFile } = {}) {
  if (typeof readData !== 'function') throw new TypeError('readData doit être une fonction.');
  const sealArtifact = await readJson(readData, METADATA_SEAL_ARTIFACT_PATH);
  const manifestInputs = [];
  for (const seriesId of ['paej', 'worldProxy']) {
    manifestInputs.push(await readJson(readData, LICENSED_MANIFEST_PATHS[seriesId]));
  }

  // Cette préparation valide le scellement et les manifestes avant le premier accès aux CSV.
  const preparedOpen = prepareAcceleratedHistoricalValueOpen({
    seal: sealArtifact.metadataSeal,
    manifestInputs,
    valueGateMethod: sealArtifact.licensedInputGateMethod
  });

  const rawFilesBySeries = {};
  for (const seriesId of ['paej', 'worldProxy']) {
    rawFilesBySeries[seriesId] = await readData(LICENSED_VALUE_PATHS[seriesId]);
  }
  return Object.freeze({ preparedOpen, rawFilesBySeries: Object.freeze(rawFilesBySeries) });
}

export function buildAcceleratedHistoricalLicensedInputEvidence({ preparedOpen, rawFilesBySeries, verifiedAt, parseCsv } = {}) {
  const opened = verifyAndOpenAcceleratedHistoricalValueSet({ preparedOpen, rawFilesBySeries, verifiedAt, parseCsv });
  return Object.freeze({
    schemaVersion: 1,
    experimentId: preparedOpen.campaignId,
    inputEvidence: opened.evidence,
    valuesPersistedInArtifact: false,
    analysisStarted: false,
    results: Object.freeze([]),
    engineModified: false
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const verifiedAt = process.env.LEYNOR_LICENSED_INPUTS_VERIFIED_AT;
  if (!verifiedAt) throw new TypeError('LEYNOR_LICENSED_INPUTS_VERIFIED_AT est requis et doit être fixé avant le hachage des fichiers licenciés.');
  const loaded = await loadAcceleratedHistoricalLicensedInputs();
  const artifact = buildAcceleratedHistoricalLicensedInputEvidence({ ...loaded, verifiedAt });
  await mkdir('artifacts', { recursive: true });
  await writeFile(LICENSED_INPUT_EVIDENCE_PATH, `${JSON.stringify(artifact, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
}
