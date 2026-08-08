import { createHash } from 'node:crypto';
import { createAcceleratedHistoricalWindowRegistry } from './portfolioAcceleratedHistoricalCampaign.js';
import { bindDependenceMethodToWindowRegistry } from './portfolioAcceleratedHistoricalDependenceAudit.js';

const FORBIDDEN_VALUE_KEYS = Object.freeze(['csv', 'levels', 'prices', 'returns', 'series', 'values']);
const REQUIRED_SERIES_IDS = Object.freeze(['paej', 'worldProxy']);
const ALLOWED_METADATA_KEYS = Object.freeze([
  'acquiredAt',
  'coverageEnd',
  'coverageStart',
  'currency',
  'indexCode',
  'licenseReference',
  'normalizedFingerprint',
  'observationInterval',
  'pointInTimeStatus',
  'provider',
  'rawFingerprint',
  'returnValuesIncluded',
  'returnVariant',
  'seriesId',
  'validationEligible',
  'valueFileName',
  'valueSchema'
]);

function nonEmpty(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`);
  return value.trim();
}

function dateOnly(value, field) {
  const text = nonEmpty(value, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new TypeError(`${field} doit être YYYY-MM-DD.`);
  const parsed = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text) throw new TypeError(`${field} doit être une date valide.`);
  return text;
}

function isoUtc(value, field) {
  const text = nonEmpty(value, field);
  const parsed = new Date(text);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(text) || Number.isNaN(parsed.getTime())) {
    throw new TypeError(`${field} doit être une date ISO UTC.`);
  }
  const canonical = text.includes('.') ? text : text.replace('Z', '.000Z');
  if (parsed.toISOString() !== canonical) throw new TypeError(`${field} doit être une date ISO UTC valide.`);
  return text;
}

function sha256(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function sha256Text(value, field) {
  const text = nonEmpty(value, field).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(text)) throw new TypeError(`${field} doit être une empreinte SHA-256.`);
  return text;
}

function positiveInteger(value, field) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) throw new TypeError(`${field} doit être un entier positif.`);
  return number;
}

function addMonths(date, months) {
  const [year, month, day] = date.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + months, day));
  if (shifted.getUTCDate() !== day) throw new TypeError(`${date} ne peut pas être décalée de ${months} mois sans ambiguïté.`);
  return shifted.toISOString().slice(0, 10);
}

function firstFullMonthOnOrAfter(date) {
  if (date.endsWith('-01')) return date;
  return addMonths(`${date.slice(0, 7)}-01`, 1);
}

function assertMetadataOnly(input, field) {
  for (const key of FORBIDDEN_VALUE_KEYS) {
    if (Object.hasOwn(input, key)) throw new TypeError(`${field}.${key} est interdit dans un manifeste métadonnées-seulement.`);
  }
  const unexpected = Object.keys(input).filter(key => !ALLOWED_METADATA_KEYS.includes(key)).sort();
  if (unexpected.length > 0) throw new TypeError(`${field} contient des champs non autorisés: ${unexpected.join(', ')}.`);
}

export function createLicensedCoverageMetadata(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input doit être un objet manifeste.');
  assertMetadataOnly(input, 'manifest');
  const payload = {
    schemaVersion: 1,
    seriesId: nonEmpty(input.seriesId, 'seriesId'),
    provider: nonEmpty(input.provider, 'provider'),
    licenseReference: nonEmpty(input.licenseReference, 'licenseReference'),
    indexCode: nonEmpty(input.indexCode, 'indexCode'),
    returnVariant: nonEmpty(input.returnVariant, 'returnVariant'),
    currency: nonEmpty(input.currency, 'currency').toUpperCase(),
    observationInterval: nonEmpty(input.observationInterval, 'observationInterval'),
    coverageStart: dateOnly(input.coverageStart, 'coverageStart'),
    coverageEnd: dateOnly(input.coverageEnd, 'coverageEnd'),
    acquiredAt: isoUtc(input.acquiredAt, 'acquiredAt'),
    pointInTimeStatus: nonEmpty(input.pointInTimeStatus, 'pointInTimeStatus'),
    rawFingerprint: sha256Text(input.rawFingerprint, 'rawFingerprint'),
    normalizedFingerprint: sha256Text(input.normalizedFingerprint, 'normalizedFingerprint'),
    valueFileName: nonEmpty(input.valueFileName, 'valueFileName'),
    valueSchema: nonEmpty(input.valueSchema, 'valueSchema'),
    validationEligible: input.validationEligible === true,
    returnValuesIncluded: input.returnValuesIncluded === true
  };
  if (!REQUIRED_SERIES_IDS.includes(payload.seriesId)) throw new TypeError(`seriesId non autorisé: ${payload.seriesId}.`);
  if (payload.currency !== 'EUR') throw new TypeError('currency doit être EUR.');
  if (payload.observationInterval !== 'daily') throw new TypeError('observationInterval doit être daily.');
  if (payload.coverageEnd < payload.coverageStart) throw new TypeError('coverageEnd doit être postérieure ou égale à coverageStart.');
  if (!payload.validationEligible) throw new TypeError('validationEligible doit être true.');
  if (payload.returnValuesIncluded) throw new TypeError('returnValuesIncluded doit être false avant le scellement.');
  if (payload.valueFileName !== `${payload.seriesId}.csv`) throw new TypeError(`valueFileName attendu: ${payload.seriesId}.csv.`);
  if (payload.valueSchema !== 'date,level') throw new TypeError('valueSchema doit être date,level.');
  return Object.freeze({ ...payload, fingerprint: sha256(payload) });
}

export function createAcceleratedHistoricalMetadataSelectionMethod(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input doit être un objet.');
  const payload = {
    schemaVersion: 1,
    methodId: nonEmpty(input.methodId, 'methodId'),
    methodVersion: nonEmpty(input.methodVersion, 'methodVersion'),
    registeredAt: isoUtc(input.registeredAt, 'registeredAt'),
    protocolFingerprint: sha256Text(input.protocolFingerprint, 'protocolFingerprint'),
    requiredSeriesIds: Object.freeze([...(input.requiredSeriesIds ?? [])].map((value, index) => nonEmpty(value, `requiredSeriesIds[${index}]`)).sort()),
    commonCoverageRule: nonEmpty(input.commonCoverageRule, 'commonCoverageRule'),
    minimumTrainingMonths: positiveInteger(input.minimumTrainingMonths, 'minimumTrainingMonths'),
    horizonMonths: positiveInteger(input.horizonMonths, 'horizonMonths'),
    strideMonths: positiveInteger(input.strideMonths, 'strideMonths'),
    originAlignmentRule: nonEmpty(input.originAlignmentRule, 'originAlignmentRule'),
    returnValuesAccessibleAtLock: input.returnValuesAccessibleAtLock === true,
    amendmentReason: nonEmpty(input.amendmentReason, 'amendmentReason')
  };
  if (JSON.stringify(payload.requiredSeriesIds) !== JSON.stringify(REQUIRED_SERIES_IDS)) throw new TypeError('requiredSeriesIds doit contenir exactement paej et worldProxy.');
  if (payload.commonCoverageRule !== 'intersection-of-declared-coverage') throw new TypeError('commonCoverageRule invalide.');
  if (payload.minimumTrainingMonths !== 36) throw new TypeError('minimumTrainingMonths doit rester fixé à 36 conformément à la campagne de référence.');
  if (payload.horizonMonths !== 12 || payload.strideMonths !== 12) throw new TypeError('horizonMonths et strideMonths doivent rester fixés à 12.');
  if (payload.originAlignmentRule !== 'first-full-month-after-common-start-plus-training') throw new TypeError('originAlignmentRule invalide.');
  if (payload.returnValuesAccessibleAtLock) throw new TypeError('la méthode de sélection doit être verrouillée sans accès aux valeurs.');
  return Object.freeze({ ...payload, status: 'selection-method-locked-before-return-values', fingerprint: sha256(payload) });
}

function normalizeManifestSet(inputs) {
  if (!Array.isArray(inputs)) throw new TypeError('manifests doit être un tableau.');
  const manifests = inputs.map(createLicensedCoverageMetadata).sort((left, right) => left.seriesId.localeCompare(right.seriesId));
  const ids = manifests.map(manifest => manifest.seriesId);
  if (JSON.stringify(ids) !== JSON.stringify(REQUIRED_SERIES_IDS)) throw new TypeError('les manifestes doivent contenir exactement paej et worldProxy.');
  return Object.freeze(manifests);
}

function deriveCandidateWindows(protocol, selectionMethod, commonCoverage) {
  const trainingStart = firstFullMonthOnOrAfter(commonCoverage.startDate);
  const firstOrigin = addMonths(trainingStart, selectionMethod.minimumTrainingMonths);
  const candidates = [];
  const registeredDate = protocol.registeredAt.slice(0, 10);
  for (let originDate = firstOrigin; ; originDate = addMonths(originDate, selectionMethod.strideMonths)) {
    const maturityDate = addMonths(originDate, selectionMethod.horizonMonths);
    if (maturityDate > commonCoverage.endDate || maturityDate >= registeredDate) break;
    candidates.push(Object.freeze({
      windowId: `${originDate.slice(0, 7)}_to_${maturityDate.slice(0, 7)}`,
      originDate,
      maturityDate,
      selectedWithoutReturnValueAccess: true
    }));
  }
  return Object.freeze({ trainingStart, candidates: Object.freeze(candidates) });
}

export function sealAcceleratedHistoricalMetadata({ protocol, dependenceMethod, selectionMethod, manifests, sealedAt, returnValuesAccessibleAtSeal } = {}) {
  if (!protocol?.fingerprint) throw new TypeError('protocol verrouillé requis.');
  if (selectionMethod?.status !== 'selection-method-locked-before-return-values') throw new TypeError('méthode de sélection verrouillée requise.');
  if (selectionMethod.protocolFingerprint !== protocol.fingerprint) throw new TypeError('la méthode de sélection ne correspond pas au protocole.');
  if (dependenceMethod?.status !== 'method-locked-before-return-values') throw new TypeError('méthode de dépendance verrouillée requise.');
  if (returnValuesAccessibleAtSeal !== false) throw new TypeError('le scellement doit précéder tout accès aux valeurs.');
  const normalizedSealedAt = isoUtc(sealedAt, 'sealedAt');
  if (Date.parse(normalizedSealedAt) < Date.parse(selectionMethod.registeredAt)) throw new TypeError('sealedAt ne peut pas précéder le verrouillage de la méthode de sélection.');
  const normalizedManifests = normalizeManifestSet(manifests);
  if (normalizedManifests.some(manifest => Date.parse(manifest.acquiredAt) > Date.parse(normalizedSealedAt))) {
    throw new TypeError('sealedAt doit être postérieur ou égal à l’acquisition de chaque manifeste.');
  }
  const commonCoverage = Object.freeze({
    startDate: normalizedManifests.map(manifest => manifest.coverageStart).sort().at(-1),
    endDate: normalizedManifests.map(manifest => manifest.coverageEnd).sort().at(0)
  });
  if (commonCoverage.endDate < commonCoverage.startDate) throw new TypeError('les manifestes ne partagent aucune couverture commune.');
  const derived = deriveCandidateWindows(protocol, selectionMethod, commonCoverage);
  const windowRegistry = createAcceleratedHistoricalWindowRegistry(protocol, derived.candidates);
  if (windowRegistry.windows.length === 0) throw new TypeError('la couverture commune ne produit aucune fenêtre admissible après entraînement.');
  const dependenceAudit = bindDependenceMethodToWindowRegistry(dependenceMethod, windowRegistry, {
    boundAt: normalizedSealedAt,
    returnValuesAccessibleAtBinding: false
  });
  const manifestBindings = Object.freeze(normalizedManifests.map(manifest => Object.freeze({
    seriesId: manifest.seriesId,
    manifestFingerprint: manifest.fingerprint,
    expectedRawFingerprint: manifest.rawFingerprint,
    expectedNormalizedFingerprint: manifest.normalizedFingerprint,
    valueFileName: manifest.valueFileName
  })));
  const payload = {
    schemaVersion: 1,
    campaignId: protocol.campaignId,
    sealedAt: normalizedSealedAt,
    protocolFingerprint: protocol.fingerprint,
    selectionMethodFingerprint: selectionMethod.fingerprint,
    dependenceMethodFingerprint: dependenceMethod.fingerprint,
    manifestBindings,
    commonCoverage,
    trainingStart: derived.trainingStart,
    windowRegistry,
    dependenceAudit,
    returnValuesAccessibleAtSeal: false,
    valueFilesMayBeHashedThenParsedAfterAuthorization: true
  };
  return Object.freeze({ ...payload, status: 'metadata-sealed-values-unopened', fingerprint: sha256(payload) });
}

export function authorizeAcceleratedHistoricalValueOpen({ seal, seriesId, manifestFingerprint } = {}) {
  if (seal?.status !== 'metadata-sealed-values-unopened' || seal.returnValuesAccessibleAtSeal !== false) throw new TypeError('scellement métadonnées valide requis.');
  const id = nonEmpty(seriesId, 'seriesId');
  const binding = seal.manifestBindings.find(item => item.seriesId === id);
  if (!binding) throw new TypeError(`série non liée au scellement: ${id}.`);
  if (sha256Text(manifestFingerprint, 'manifestFingerprint') !== binding.manifestFingerprint) throw new TypeError(`empreinte de manifeste divergente pour ${id}.`);
  const payload = {
    schemaVersion: 1,
    campaignId: seal.campaignId,
    metadataSealFingerprint: seal.fingerprint,
    seriesId: id,
    manifestFingerprint: binding.manifestFingerprint,
    expectedRawFingerprint: binding.expectedRawFingerprint,
    expectedNormalizedFingerprint: binding.expectedNormalizedFingerprint,
    valueFileName: binding.valueFileName,
    authorization: 'hash-bytes-before-parsing-and-verify-raw-fingerprint'
  };
  return Object.freeze({ ...payload, fingerprint: sha256(payload) });
}

export function verifyAcceleratedHistoricalRawFileFingerprint({ authorization, observedRawFingerprint } = {}) {
  if (authorization?.authorization !== 'hash-bytes-before-parsing-and-verify-raw-fingerprint') throw new TypeError('autorisation de hachage valide requise.');
  const observed = sha256Text(observedRawFingerprint, 'observedRawFingerprint');
  if (observed !== authorization.expectedRawFingerprint) throw new TypeError(`empreinte brute divergente pour ${authorization.seriesId}.`);
  const payload = {
    schemaVersion: 1,
    campaignId: authorization.campaignId,
    metadataSealFingerprint: authorization.metadataSealFingerprint,
    seriesId: authorization.seriesId,
    manifestFingerprint: authorization.manifestFingerprint,
    verifiedRawFingerprint: observed,
    expectedNormalizedFingerprint: authorization.expectedNormalizedFingerprint,
    valueFileName: authorization.valueFileName,
    authorization: 'parse-after-raw-fingerprint-match'
  };
  return Object.freeze({ ...payload, fingerprint: sha256(payload) });
}
