import { createHash } from 'node:crypto';

function nonEmpty(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`);
  return value.trim();
}

function isoUtc(value, field) {
  const text = nonEmpty(value, field);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(text)) throw new TypeError(`${field} doit être une date ISO UTC.`);
  const timestamp = Date.parse(text);
  const canonical = text.includes('.') ? text : text.replace('Z', '.000Z');
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== canonical) throw new TypeError(`${field} doit être une date ISO UTC valide.`);
  return text;
}

function isoLocalDate(value, field) {
  const text = nonEmpty(value, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new TypeError(`${field} doit être YYYY-MM-DD.`);
  const date = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) throw new TypeError(`${field} doit être une date valide.`);
  return text;
}

function fingerprint(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function addMonths(localDate, months) {
  const [year, month, day] = localDate.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + months, day));
  if (shifted.getUTCDate() !== day) throw new TypeError(`la date ${localDate} ne peut pas être décalée de ${months} mois sans ambiguïté.`);
  return shifted.toISOString().slice(0, 10);
}

function localDateAt(iso, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date(iso));
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function freezeArray(values) {
  return Object.freeze([...values]);
}

export function createProspectiveCampaignProtocol(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input doit être un objet.');
  const payload = {
    schemaVersion: 1,
    campaignId: nonEmpty(input.campaignId, 'campaignId'),
    protocolVersion: nonEmpty(input.protocolVersion, 'protocolVersion'),
    registeredAt: isoUtc(input.registeredAt, 'registeredAt'),
    engineCommit: nonEmpty(input.engineCommit, 'engineCommit'),
    assumptionsFingerprint: nonEmpty(input.assumptionsFingerprint, 'assumptionsFingerprint'),
    timezone: nonEmpty(input.timezone, 'timezone'),
    cadence: nonEmpty(input.cadence, 'cadence'),
    horizonMonths: Number(input.horizonMonths),
    simulationPathsPerForecast: Number(input.simulationPathsPerForecast),
    minimumIndependentForecasts: Number(input.minimumIndependentForecasts),
    portfolioIds: freezeArray((input.portfolioIds ?? []).map((value, index) => nonEmpty(value, `portfolioIds[${index}]`))),
    coverageLevels: freezeArray((input.coverageLevels ?? []).map(Number)),
    probabilityEvent: nonEmpty(input.probabilityEvent, 'probabilityEvent'),
    benchmark: nonEmpty(input.benchmark, 'benchmark'),
    score: nonEmpty(input.score, 'score'),
    exactLicensedDataRequired: input.exactLicensedDataRequired === true,
    independentHoldoutRequired: input.independentHoldoutRequired === true,
    recalibrationBeforeDecisionForbidden: input.recalibrationBeforeDecisionForbidden === true
  };
  if (payload.timezone !== 'Europe/Paris') throw new TypeError('timezone doit être Europe/Paris pour cette campagne.');
  if (payload.cadence !== 'quarterly') throw new TypeError('cadence doit être quarterly.');
  if (payload.horizonMonths !== 12) throw new TypeError('horizonMonths doit rester fixé à 12.');
  if (!Number.isInteger(payload.simulationPathsPerForecast) || payload.simulationPathsPerForecast !== 5000) throw new TypeError('simulationPathsPerForecast doit rester fixé à 5000.');
  if (!Number.isInteger(payload.minimumIndependentForecasts) || payload.minimumIndependentForecasts < 100) throw new TypeError('minimumIndependentForecasts doit être au moins 100.');
  if (payload.portfolioIds.length === 0 || new Set(payload.portfolioIds).size !== payload.portfolioIds.length) throw new TypeError('portfolioIds doit contenir des identifiants uniques.');
  if (payload.coverageLevels.length === 0 || payload.coverageLevels.some(level => !Number.isFinite(level) || level <= 0 || level >= 1)) throw new TypeError('coverageLevels invalide.');
  for (const required of ['exactLicensedDataRequired', 'independentHoldoutRequired', 'recalibrationBeforeDecisionForbidden']) {
    if (!payload[required]) throw new TypeError(`${required} doit être true.`);
  }
  return Object.freeze({ ...payload, fingerprint: fingerprint(payload) });
}

export function createProspectiveCalendar(protocol, targetOriginLocalDates) {
  if (!protocol?.fingerprint) throw new TypeError('protocol verrouillé requis.');
  if (!Array.isArray(targetOriginLocalDates) || targetOriginLocalDates.length === 0) throw new TypeError('targetOriginLocalDates doit être non vide.');
  const dates = targetOriginLocalDates.map((value, index) => isoLocalDate(value, `targetOriginLocalDates[${index}]`));
  if (new Set(dates).size !== dates.length) throw new TypeError('les dates du calendrier doivent être uniques.');
  if ([...dates].sort().some((value, index) => value !== dates[index])) throw new TypeError('les dates du calendrier doivent être strictement croissantes.');
  const registeredLocalDate = localDateAt(protocol.registeredAt, protocol.timezone);
  if (dates.some(date => date <= registeredLocalDate)) throw new TypeError('chaque origine doit être postérieure au préenregistrement.');
  const entries = dates.map((targetOriginLocalDate, index) => Object.freeze({
    scheduleId: `${protocol.campaignId}-origin-${String(index + 1).padStart(2, '0')}`,
    targetOriginLocalDate,
    maturityTargetLocalDate: addMonths(targetOriginLocalDate, protocol.horizonMonths),
    timezone: protocol.timezone,
    sealRule: 'first-eligible-observation-after-prior-month-end',
    independenceStatus: 'not-demonstrated',
    mayCountAsIndependent: false
  }));
  const payload = {
    schemaVersion: 1,
    campaignId: protocol.campaignId,
    protocolFingerprint: protocol.fingerprint,
    timezone: protocol.timezone,
    entries: Object.freeze(entries)
  };
  return Object.freeze({ ...payload, fingerprint: fingerprint(payload) });
}

export function assessProspectiveCampaignLaunch({ protocol, calendar, sourceReadiness, forecastRegistry = [] } = {}) {
  if (!protocol?.fingerprint || !calendar?.fingerprint) throw new TypeError('protocol et calendar verrouillés requis.');
  if (calendar.protocolFingerprint !== protocol.fingerprint) throw new TypeError('calendar ne correspond pas au protocol.');
  if (!Array.isArray(forecastRegistry)) throw new TypeError('forecastRegistry doit être un tableau.');
  const blockers = [];
  if (sourceReadiness?.ready !== true) {
    const sourceBlockers = Array.isArray(sourceReadiness?.blockers) && sourceReadiness.blockers.length > 0
      ? sourceReadiness.blockers
      : ['source-readiness:missing'];
    blockers.push(...sourceBlockers.map(value => `licensed-data:${value}`));
  }
  if (forecastRegistry.some(record => Object.hasOwn(record ?? {}, 'outcome') || Object.hasOwn(record ?? {}, 'binaryOutcome') || Object.hasOwn(record ?? {}, 'observedAt'))) {
    blockers.push('forecast-registry:contains-outcome-before-settlement');
  }
  const payload = {
    schemaVersion: 1,
    campaignId: protocol.campaignId,
    protocolFingerprint: protocol.fingerprint,
    calendarFingerprint: calendar.fingerprint,
    evaluatedForecastCount: forecastRegistry.length,
    independentForecastCount: null,
    blockers: Object.freeze([...new Set(blockers)].sort()),
    readyToSealForecasts: blockers.length === 0,
    mayExposeRealWorldProbability: false,
    status: blockers.length === 0 ? 'ready-to-seal-first-forecast' : 'blocked-before-first-forecast'
  };
  return Object.freeze({ ...payload, fingerprint: fingerprint(payload) });
}
