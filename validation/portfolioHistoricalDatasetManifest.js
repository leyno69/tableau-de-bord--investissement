import { createHash } from 'node:crypto';

function nonEmpty(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`);
  return value.trim();
}

function isoDate(value, field) {
  const normalized = nonEmpty(value, field);
  // Ce champ accepte aussi bien une date pure (start/end) qu'un horodatage
  // complet (acquiredAt) : on ne peut donc pas ancrer la regex en fin de
  // chaîne, seulement exiger un préfixe YYYY-MM-DD valide. Date.parse ne
  // rejette pas un jour calendaire inexistant (ex. 30 février) : il le fait
  // glisser en silence vers le mois suivant. Un aller-retour sur le préfixe
  // détecte ce glissement, que le reste de la chaîne soit vide ou porte une
  // heure.
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(normalized);
  if (!match) throw new TypeError(`${field} doit être une date ISO valide.`);
  const datePrefix = match[1];
  const parsedPrefix = Date.parse(`${datePrefix}T00:00:00Z`);
  if (!Number.isFinite(parsedPrefix) || new Date(parsedPrefix).toISOString().slice(0, 10) !== datePrefix) {
    throw new TypeError(`${field} doit être une date calendaire valide.`);
  }
  if (Number.isNaN(Date.parse(normalized))) throw new TypeError(`${field} doit être une date ISO valide.`);
  return normalized;
}

function fingerprint(payload) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export function createHistoricalDatasetManifest(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input doit être un objet.');
  const payload = {
    schemaVersion: 1,
    datasetId: nonEmpty(input.datasetId, 'datasetId'),
    usage: nonEmpty(input.usage, 'usage'),
    providerId: nonEmpty(input.providerId, 'providerId'),
    licenseReference: nonEmpty(input.licenseReference, 'licenseReference'),
    sourceSymbol: nonEmpty(input.sourceSymbol, 'sourceSymbol'),
    normalizedInstrumentId: nonEmpty(input.normalizedInstrumentId, 'normalizedInstrumentId'),
    track: nonEmpty(input.track, 'track'),
    interval: nonEmpty(input.interval, 'interval'),
    start: isoDate(input.start, 'start'),
    end: isoDate(input.end, 'end'),
    acquiredAt: isoDate(input.acquiredAt, 'acquiredAt'),
    timezone: nonEmpty(input.timezone, 'timezone'),
    currency: nonEmpty(input.currency, 'currency'),
    returnBasis: nonEmpty(input.returnBasis, 'returnBasis'),
    corporateActionPolicy: nonEmpty(input.corporateActionPolicy, 'corporateActionPolicy'),
    missingDataPolicy: nonEmpty(input.missingDataPolicy, 'missingDataPolicy'),
    pointInTimeStatus: nonEmpty(input.pointInTimeStatus, 'pointInTimeStatus'),
    rawFingerprint: nonEmpty(input.rawFingerprint, 'rawFingerprint'),
    normalizedFingerprint: nonEmpty(input.normalizedFingerprint, 'normalizedFingerprint'),
    validationEligibleSource: input.validationEligibleSource === true
  };
  if (!['fixture','development','empirical-validation'].includes(payload.usage)) throw new TypeError('usage invalide.');
  if (!['exact','proxy'].includes(payload.track)) throw new TypeError('track invalide.');
  if (Date.parse(payload.end) < Date.parse(payload.start)) throw new TypeError('end doit être postérieur ou égal à start.');
  if (payload.usage === 'empirical-validation' && !payload.validationEligibleSource) {
    throw new TypeError('une validation empirique exige une source validation-eligible.');
  }
  const manifestFingerprint = fingerprint(payload);
  return Object.freeze({ ...payload, manifestFingerprint });
}

export function assertDatasetManifestMatchesTrack(manifest, expectedTrack) {
  if (manifest.track !== expectedTrack) throw new TypeError(`track attendu: ${expectedTrack}.`);
  return true;
}
