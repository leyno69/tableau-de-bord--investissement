import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { prepareAcceleratedHistoricalCampaign } from './prepare.mjs';
import { sealAcceleratedHistoricalMetadata } from '../../validation/portfolioAcceleratedHistoricalMetadataSeal.js';

export const COVERAGE_MANIFEST_PATHS = Object.freeze([
  'data/licensed-validation/paej.manifest.json',
  'data/licensed-validation/worldProxy.manifest.json'
]);

export async function loadAcceleratedHistoricalCoverageManifests({ readText = readFile, paths = COVERAGE_MANIFEST_PATHS } = {}) {
  if (!Array.isArray(paths) || paths.length !== 2 || paths.some(path => !path.endsWith('.manifest.json'))) {
    throw new TypeError('exactement deux chemins .manifest.json sont requis.');
  }
  return Promise.all(paths.map(async path => {
    const content = await readText(path, 'utf8');
    return JSON.parse(content);
  }));
}

export function buildAcceleratedHistoricalMetadataSeal({ manifestInputs, sealedAt, returnValuesAccessibleAtSeal } = {}) {
  const campaign = prepareAcceleratedHistoricalCampaign();
  const selectionMethod = campaign.metadataSelectionMethod;
  if (Date.parse(sealedAt) < Date.parse(campaign.licensedInputGateMethod.registeredAt)) {
    throw new TypeError('sealedAt doit être postérieur ou égal au verrouillage du sas de valeurs.');
  }
  return Object.freeze({
    schemaVersion: 1,
    experimentId: campaign.experimentId,
    selectionMethod,
    licensedInputGateMethod: campaign.licensedInputGateMethod,
    metadataSeal: sealAcceleratedHistoricalMetadata({
      protocol: campaign.protocol,
      dependenceMethod: campaign.dependenceMethod,
      selectionMethod,
      manifests: manifestInputs,
      sealedAt,
      returnValuesAccessibleAtSeal
    }),
    results: Object.freeze([]),
    engineModified: false
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sealedAt = process.env.LEYNOR_METADATA_SEALED_AT;
  if (!sealedAt) throw new TypeError('LEYNOR_METADATA_SEALED_AT est requis et doit être fixé avant toute lecture des valeurs.');
  if (process.env.LEYNOR_RETURN_VALUES_ACCESSED_AT_SEAL !== 'false') {
    throw new TypeError('LEYNOR_RETURN_VALUES_ACCESSED_AT_SEAL=false est requis ; toute autre valeur bloque le scellement.');
  }
  const manifestInputs = await loadAcceleratedHistoricalCoverageManifests();
  const artifact = buildAcceleratedHistoricalMetadataSeal({ manifestInputs, sealedAt, returnValuesAccessibleAtSeal: false });
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/portfolio-probability-accelerated-historical-v1-metadata-seal.json', `${JSON.stringify(artifact, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
}
