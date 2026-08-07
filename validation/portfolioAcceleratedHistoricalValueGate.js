import { createHash } from 'node:crypto';
import { TextDecoder } from 'node:util';
import { parseLicensedBenchmarkCsv } from './licensedBenchmarkCsv.js';
import {
  createLicensedCoverageMetadata,
  authorizeAcceleratedHistoricalValueOpen,
  verifyAcceleratedHistoricalRawFileFingerprint
} from './portfolioAcceleratedHistoricalMetadataSeal.js';

const REQUIRED_SERIES_IDS = Object.freeze(['paej', 'worldProxy']);
const UTF8_DECODER = new TextDecoder('utf-8', { fatal: true });

function sha256Bytes(value) {
  return createHash('sha256').update(value).digest('hex');
}

function sha256(value) {
  return sha256Bytes(Buffer.from(JSON.stringify(value), 'utf8'));
}

function sha256Text(value, field) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) throw new TypeError(`${field} doit être une empreinte SHA-256.`);
  return value;
}

function isoUtc(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une date ISO UTC.`);
  const text = value.trim();
  const parsed = new Date(text);
  const canonical = text.includes('.') ? text : text.replace('Z', '.000Z');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(text) || Number.isNaN(parsed.getTime()) || parsed.toISOString() !== canonical) {
    throw new TypeError(`${field} doit être une date ISO UTC valide.`);
  }
  return text;
}

function rawBytes(value, field) {
  if (!Buffer.isBuffer(value) && !(value instanceof Uint8Array)) throw new TypeError(`${field} doit contenir les octets bruts du fichier.`);
  if (value.byteLength === 0) throw new TypeError(`${field} ne peut pas être vide.`);
  return Buffer.from(value);
}

function normalizeManifestSet(manifestInputs) {
  if (!Array.isArray(manifestInputs)) throw new TypeError('manifestInputs doit être un tableau.');
  const manifests = manifestInputs.map(createLicensedCoverageMetadata).sort((left, right) => left.seriesId.localeCompare(right.seriesId));
  if (JSON.stringify(manifests.map(item => item.seriesId)) !== JSON.stringify(REQUIRED_SERIES_IDS)) {
    throw new TypeError('manifestInputs doit contenir exactement paej et worldProxy.');
  }
  return Object.freeze(manifests);
}

function assertExactSeriesKeys(input, field) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError(`${field} doit être un objet.`);
  const keys = Object.keys(input).sort();
  if (JSON.stringify(keys) !== JSON.stringify(REQUIRED_SERIES_IDS)) throw new TypeError(`${field} doit contenir exactement paej et worldProxy.`);
}

function canonicalLevel(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new TypeError(`${field} doit être un niveau fini strictement positif.`);
  return String(number);
}

export function serializeAcceleratedHistoricalNormalizedSeries(series) {
  if (!Array.isArray(series) || series.length < 2) throw new TypeError('series doit contenir au moins deux observations.');
  const seen = new Set();
  let previousDate = null;
  const rows = series.map((observation, index) => {
    if (!observation || typeof observation !== 'object' || Array.isArray(observation)) throw new TypeError(`series[${index}] doit être un objet.`);
    const date = observation.date;
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
      throw new TypeError(`series[${index}].date doit être YYYY-MM-DD.`);
    }
    if (seen.has(date)) throw new TypeError(`date dupliquée: ${date}.`);
    if (previousDate !== null && date <= previousDate) throw new TypeError('series doit être strictement ordonnée par date croissante.');
    seen.add(date);
    previousDate = date;
    return `${date},${canonicalLevel(observation.price, `series[${index}].price`)}`;
  });
  return `date,level\n${rows.join('\n')}\n`;
}

export function fingerprintAcceleratedHistoricalNormalizedSeries(series) {
  return sha256Bytes(Buffer.from(serializeAcceleratedHistoricalNormalizedSeries(series), 'utf8'));
}

export function createAcceleratedHistoricalValueGateMethod({ registeredAt, protocolFingerprint, returnValuesAccessibleAtLock } = {}) {
  const payload = {
    schemaVersion: 1,
    methodId: 'portfolio-probability-accelerated-historical-value-gate-v1',
    registeredAt: isoUtc(registeredAt, 'registeredAt'),
    protocolFingerprint: sha256Text(protocolFingerprint, 'protocolFingerprint'),
    rawFingerprintAlgorithm: 'sha256-exact-file-bytes',
    rawSetVerificationRule: 'verify-both-before-any-parsing',
    textDecoding: 'utf-8-fatal',
    parser: 'licensed-benchmark-csv-date-level-v1',
    normalizedSerialization: 'utf8-csv-date-level-lf-final-newline-numeric-string-v1',
    normalizedFingerprintAlgorithm: 'sha256-canonical-normalized-bytes',
    coverageRule: 'first-and-last-observed-date-equal-declared-coverage',
    evidenceValuesPolicy: 'metadata-and-fingerprints-only',
    returnValuesAccessibleAtLock: returnValuesAccessibleAtLock === true
  };
  if (payload.returnValuesAccessibleAtLock) throw new TypeError('le sas de valeurs doit être verrouillé avant accès aux valeurs.');
  return Object.freeze({ ...payload, status: 'value-gate-method-locked-before-return-values', fingerprint: sha256(payload) });
}

export function prepareAcceleratedHistoricalValueOpen({ seal, manifestInputs, valueGateMethod } = {}) {
  if (seal?.status !== 'metadata-sealed-values-unopened') throw new TypeError('scellement métadonnées valide requis avant toute lecture des fichiers de valeurs.');
  if (valueGateMethod?.status !== 'value-gate-method-locked-before-return-values' || valueGateMethod.returnValuesAccessibleAtLock !== false) {
    throw new TypeError('méthode de sas verrouillée avant valeurs requise.');
  }
  if (valueGateMethod.protocolFingerprint !== seal.protocolFingerprint) throw new TypeError('la méthode de sas ne correspond pas au protocole scellé.');
  if (Date.parse(valueGateMethod.registeredAt) > Date.parse(seal.sealedAt)) throw new TypeError('la méthode de sas doit précéder le scellement des métadonnées.');
  const manifests = normalizeManifestSet(manifestInputs);
  const authorizations = Object.freeze(manifests.map(manifest => authorizeAcceleratedHistoricalValueOpen({
    seal,
    seriesId: manifest.seriesId,
    manifestFingerprint: manifest.fingerprint
  })));
  const payload = {
    schemaVersion: 1,
    campaignId: seal.campaignId,
    metadataSealFingerprint: seal.fingerprint,
    metadataSealedAt: seal.sealedAt,
    valueGateMethodFingerprint: valueGateMethod.fingerprint,
    manifests,
    authorizations,
    rawValueBytesAccessibleAtPreparation: false
  };
  return Object.freeze({
    ...payload,
    status: 'raw-byte-hashing-authorized-values-unparsed',
    fingerprint: sha256(payload)
  });
}

export function verifyAndOpenAcceleratedHistoricalValueSet({ preparedOpen, rawFilesBySeries, verifiedAt, parseCsv = parseLicensedBenchmarkCsv } = {}) {
  if (preparedOpen?.status !== 'raw-byte-hashing-authorized-values-unparsed' || preparedOpen.rawValueBytesAccessibleAtPreparation !== false) {
    throw new TypeError('préparation d’ouverture valide requise.');
  }
  if (typeof parseCsv !== 'function') throw new TypeError('parseCsv doit être une fonction.');
  const normalizedVerifiedAt = isoUtc(verifiedAt, 'verifiedAt');
  if (Date.parse(normalizedVerifiedAt) < Date.parse(preparedOpen.metadataSealedAt)) throw new TypeError('verifiedAt ne peut pas précéder le scellement des métadonnées.');
  assertExactSeriesKeys(rawFilesBySeries, 'rawFilesBySeries');

  const rawInputs = Object.fromEntries(REQUIRED_SERIES_IDS.map(seriesId => [
    seriesId,
    rawBytes(rawFilesBySeries[seriesId], `rawFilesBySeries.${seriesId}`)
  ]));

  // Toutes les empreintes brutes sont contrôlées avant le premier parsing.
  const rawVerifications = preparedOpen.authorizations.map(authorization => verifyAcceleratedHistoricalRawFileFingerprint({
    authorization,
    observedRawFingerprint: sha256Bytes(rawInputs[authorization.seriesId])
  }));

  const opened = rawVerifications.map(rawVerification => {
    const manifest = preparedOpen.manifests.find(item => item.seriesId === rawVerification.seriesId);
    let csv;
    try {
      csv = UTF8_DECODER.decode(rawInputs[rawVerification.seriesId]);
    } catch {
      throw new TypeError(`encodage UTF-8 invalide pour ${rawVerification.seriesId}.`);
    }
    const dataset = parseCsv(csv, manifest);
    const firstDate = dataset.series[0].date;
    const lastDate = dataset.series.at(-1).date;
    if (firstDate !== manifest.coverageStart || lastDate !== manifest.coverageEnd) {
      throw new TypeError(`couverture observée divergente pour ${rawVerification.seriesId}.`);
    }
    const normalizedFingerprint = fingerprintAcceleratedHistoricalNormalizedSeries(dataset.series);
    if (normalizedFingerprint !== rawVerification.expectedNormalizedFingerprint) {
      throw new TypeError(`empreinte normalisée divergente pour ${rawVerification.seriesId}.`);
    }
    return Object.freeze({
      seriesId: rawVerification.seriesId,
      manifestFingerprint: rawVerification.manifestFingerprint,
      rawFingerprint: rawVerification.verifiedRawFingerprint,
      normalizedFingerprint,
      observationCount: dataset.series.length,
      coverageStart: firstDate,
      coverageEnd: lastDate,
      dataset
    });
  });

  const seriesEvidence = Object.freeze(opened.map(item => Object.freeze({
    seriesId: item.seriesId,
    manifestFingerprint: item.manifestFingerprint,
    rawFingerprint: item.rawFingerprint,
    normalizedFingerprint: item.normalizedFingerprint,
    observationCount: item.observationCount,
    coverageStart: item.coverageStart,
    coverageEnd: item.coverageEnd
  })));
  const evidencePayload = {
    schemaVersion: 1,
    campaignId: preparedOpen.campaignId,
    metadataSealFingerprint: preparedOpen.metadataSealFingerprint,
    valueOpenPreparationFingerprint: preparedOpen.fingerprint,
    valueGateMethodFingerprint: preparedOpen.valueGateMethodFingerprint,
    verifiedAt: normalizedVerifiedAt,
    seriesEvidence,
    rawFingerprintsVerifiedBeforeAnyParsing: true,
    normalizedFingerprintsVerifiedBeforeAnalysis: true,
    valuesEmbeddedInEvidence: false
  };
  const evidence = Object.freeze({
    ...evidencePayload,
    status: 'licensed-input-set-verified-before-analysis',
    fingerprint: sha256(evidencePayload)
  });
  const datasetsBySeries = Object.freeze(Object.fromEntries(opened.map(item => [item.seriesId, item.dataset])));
  return Object.freeze({ evidence, datasetsBySeries });
}
