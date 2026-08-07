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

function dateOnly(value, field) {
  const text = nonEmpty(value, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new TypeError(`${field} doit être YYYY-MM-DD.`);
  const parsed = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text) throw new TypeError(`${field} doit être une date valide.`);
  return text;
}

function sha256(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function sha256Text(value, field) {
  const text = nonEmpty(value, field);
  if (!/^[a-f0-9]{64}$/i.test(text)) throw new TypeError(`${field} doit être une empreinte SHA-256.`);
  return text.toLowerCase();
}

function addMonths(localDate, months) {
  const [year, month, day] = localDate.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + months, day));
  if (shifted.getUTCDate() !== day) throw new TypeError(`la date ${localDate} ne peut pas être décalée de ${months} mois sans ambiguïté.`);
  return shifted.toISOString().slice(0, 10);
}

function normalizeIntervals(values = []) {
  if (!Array.isArray(values)) throw new TypeError('previouslyInspectedIntervals doit être un tableau.');
  return Object.freeze(values.map((value, index) => {
    const startDate = dateOnly(value?.startDate, `previouslyInspectedIntervals[${index}].startDate`);
    const endDate = dateOnly(value?.endDate, `previouslyInspectedIntervals[${index}].endDate`);
    if (endDate < startDate) throw new TypeError(`previouslyInspectedIntervals[${index}] est inversé.`);
    return Object.freeze({
      evidenceId: nonEmpty(value.evidenceId, `previouslyInspectedIntervals[${index}].evidenceId`),
      startDate,
      endDate
    });
  }));
}

function overlaps(left, right) {
  return left.originDate < right.endDate && left.maturityDate > right.startDate;
}

export function createAcceleratedHistoricalProtocol(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input doit être un objet.');
  const payload = {
    schemaVersion: 1,
    campaignId: nonEmpty(input.campaignId, 'campaignId'),
    protocolVersion: nonEmpty(input.protocolVersion, 'protocolVersion'),
    registeredAt: isoUtc(input.registeredAt, 'registeredAt'),
    engineCommit: nonEmpty(input.engineCommit, 'engineCommit'),
    assumptionsFingerprint: nonEmpty(input.assumptionsFingerprint, 'assumptionsFingerprint'),
    horizonMonths: Number(input.horizonMonths),
    simulationPathsPerForecast: Number(input.simulationPathsPerForecast),
    score: nonEmpty(input.score, 'score'),
    benchmark: nonEmpty(input.benchmark, 'benchmark'),
    sourceTrack: nonEmpty(input.sourceTrack, 'sourceTrack'),
    windowSelectionRule: nonEmpty(input.windowSelectionRule, 'windowSelectionRule'),
    previouslyInspectedIntervals: normalizeIntervals(input.previouslyInspectedIntervals),
    exactLicensedDataRequired: input.exactLicensedDataRequired === true,
    recalibrationBeforeDecisionForbidden: input.recalibrationBeforeDecisionForbidden === true,
    developmentFallbackForbidden: input.developmentFallbackForbidden === true,
    positiveDecisionAuthority: nonEmpty(input.positiveDecisionAuthority, 'positiveDecisionAuthority'),
    negativeDecisionAuthority: nonEmpty(input.negativeDecisionAuthority, 'negativeDecisionAuthority'),
    primaryFalsificationRule: nonEmpty(input.primaryFalsificationRule, 'primaryFalsificationRule'),
    uncertaintyRule: nonEmpty(input.uncertaintyRule, 'uncertaintyRule')
  };
  if (payload.horizonMonths !== 12) throw new TypeError('horizonMonths doit rester fixé à 12 pour tester la revendication existante.');
  if (!Number.isInteger(payload.simulationPathsPerForecast) || payload.simulationPathsPerForecast !== 5000) throw new TypeError('simulationPathsPerForecast doit rester fixé à 5000.');
  if (payload.score !== 'brier-score') throw new TypeError('score doit être brier-score.');
  if (payload.benchmark !== 'dynamic-point-in-time-base-rate') throw new TypeError('benchmark dynamique point-in-time requis.');
  if (payload.sourceTrack !== 'exact-licensed-eur') throw new TypeError('sourceTrack doit être exact-licensed-eur.');
  if (payload.windowSelectionRule !== 'metadata-only-oldest-first-non-overlapping-12-month') throw new TypeError('windowSelectionRule non autorisée.');
  if (payload.positiveDecisionAuthority !== 'retrospective-support-only') throw new TypeError('la campagne historique ne peut pas recevoir une autorité de validation positive.');
  if (payload.negativeDecisionAuthority !== 'may-reject-after-independent-audit') throw new TypeError('negativeDecisionAuthority invalide.');
  if (payload.primaryFalsificationRule !== 'paired-brier-delta-ci95-lower-above-zero') throw new TypeError('primaryFalsificationRule invalide.');
  if (payload.uncertaintyRule !== 'dependence-aware-preregistered-method-required') throw new TypeError('uncertaintyRule invalide.');
  for (const field of ['exactLicensedDataRequired', 'recalibrationBeforeDecisionForbidden', 'developmentFallbackForbidden']) {
    if (!payload[field]) throw new TypeError(`${field} doit être true.`);
  }
  return Object.freeze({ ...payload, fingerprint: sha256(payload) });
}

export function createAcceleratedHistoricalWindowRegistry(protocol, candidateWindows = []) {
  if (!protocol?.fingerprint) throw new TypeError('protocol verrouillé requis.');
  if (!Array.isArray(candidateWindows)) throw new TypeError('candidateWindows doit être un tableau.');
  const registeredDate = protocol.registeredAt.slice(0, 10);
  const seen = new Set();
  const windows = candidateWindows.map((value, index) => {
    const windowId = nonEmpty(value?.windowId, `candidateWindows[${index}].windowId`);
    if (seen.has(windowId)) throw new TypeError(`windowId dupliqué: ${windowId}.`);
    seen.add(windowId);
    const originDate = dateOnly(value.originDate, `candidateWindows[${index}].originDate`);
    const maturityDate = dateOnly(value.maturityDate, `candidateWindows[${index}].maturityDate`);
    if (maturityDate !== addMonths(originDate, protocol.horizonMonths)) throw new TypeError(`${windowId}: maturité incompatible avec l'horizon verrouillé.`);
    if (maturityDate >= registeredDate) throw new TypeError(`${windowId}: la fenêtre historique doit être entièrement antérieure au préenregistrement.`);
    if (value.selectedWithoutReturnValueAccess !== true) throw new TypeError(`${windowId}: selectedWithoutReturnValueAccess doit être true.`);
    const overlappingEvidenceIds = protocol.previouslyInspectedIntervals
      .filter(interval => overlaps({ originDate, maturityDate }, interval))
      .map(interval => interval.evidenceId)
      .sort();
    return Object.freeze({
      windowId,
      originDate,
      maturityDate,
      selectedWithoutReturnValueAccess: true,
      historicalOutcomeNovelty: overlappingEvidenceIds.length === 0 ? 'not-previously-inspected-by-registered-evidence' : 'previously-inspected-period',
      overlappingEvidenceIds: Object.freeze(overlappingEvidenceIds),
      mayCountAsIndependent: false,
      independenceStatus: 'audit-required'
    });
  }).sort((a, b) => a.originDate.localeCompare(b.originDate));
  for (let index = 1; index < windows.length; index += 1) {
    if (windows[index].originDate < windows[index - 1].maturityDate) throw new TypeError('les fenêtres accélérées doivent être temporellement non chevauchantes.');
  }
  const payload = {
    schemaVersion: 1,
    campaignId: protocol.campaignId,
    protocolFingerprint: protocol.fingerprint,
    selectionRule: protocol.windowSelectionRule,
    windows: Object.freeze(windows),
    independentWindowCount: null
  };
  return Object.freeze({ ...payload, fingerprint: sha256(payload) });
}

export function assessAcceleratedHistoricalLaunch({ protocol, windowRegistry, sourceReadiness, dependenceAudit, resultRegistry = [] } = {}) {
  if (!protocol?.fingerprint || !windowRegistry?.fingerprint) throw new TypeError('protocol et windowRegistry verrouillés requis.');
  if (windowRegistry.protocolFingerprint !== protocol.fingerprint) throw new TypeError('windowRegistry ne correspond pas au protocol.');
  if (!Array.isArray(resultRegistry)) throw new TypeError('resultRegistry doit être un tableau.');
  const blockers = [];
  if (sourceReadiness?.ready !== true) {
    const sourceBlockers = Array.isArray(sourceReadiness?.blockers) && sourceReadiness.blockers.length > 0
      ? sourceReadiness.blockers
      : ['source-readiness:missing'];
    blockers.push(...sourceBlockers.map(value => `licensed-data:${value}`));
  }
  if (windowRegistry.windows.length === 0) blockers.push('historical-window-registry:empty-before-source-metadata');
  let dependenceAuditFingerprint = null;
  if (dependenceAudit?.status !== 'locked-before-return-values') {
    blockers.push('dependence-audit:method-not-locked');
  } else {
    dependenceAuditFingerprint = sha256Text(dependenceAudit.fingerprint, 'dependenceAudit.fingerprint');
  }
  if (resultRegistry.length > 0) blockers.push('result-registry:must-be-empty-at-launch');
  const payload = {
    schemaVersion: 1,
    campaignId: protocol.campaignId,
    protocolFingerprint: protocol.fingerprint,
    windowRegistryFingerprint: windowRegistry.fingerprint,
    dependenceAuditFingerprint,
    blockers: Object.freeze([...new Set(blockers)].sort()),
    readyToRun: blockers.length === 0,
    status: blockers.length === 0 ? 'ready-for-locked-historical-run' : 'blocked-before-locked-historical-run',
    resultCount: resultRegistry.length,
    independentWindowCount: null,
    mayValidateProbabilityClaim: false,
    mayExposeRealWorldProbability: false
  };
  return Object.freeze({ ...payload, fingerprint: sha256(payload) });
}

export function classifyAcceleratedHistoricalEvidence({ protocol, evaluation } = {}) {
  if (!protocol?.fingerprint) throw new TypeError('protocol verrouillé requis.');
  if (!evaluation || typeof evaluation !== 'object' || Array.isArray(evaluation)) throw new TypeError('evaluation doit être un objet.');
  const modelBrier = Number(evaluation.modelBrier);
  const benchmarkBrier = Number(evaluation.benchmarkBrier);
  const lower = Number(evaluation.pairedBrierDeltaCi95?.lower);
  const upper = Number(evaluation.pairedBrierDeltaCi95?.upper);
  if (![modelBrier, benchmarkBrier, lower, upper].every(Number.isFinite)) throw new TypeError('métriques de Brier et intervalle finis requis.');
  if (lower > upper) throw new TypeError('pairedBrierDeltaCi95 est inversé.');
  const campaignValid = evaluation.campaignValid === true;
  const auditEligible = evaluation.independenceAuditStatus === 'eligible-for-negative-decision';
  if (auditEligible) sha256Text(evaluation.dependenceAuditFingerprint, 'evaluation.dependenceAuditFingerprint');
  let verdict = 'inconclusive';
  const reasons = [];
  if (!campaignValid) {
    verdict = 'invalid-campaign';
    reasons.push('campaign-validity-gate-failed');
  } else if (!auditEligible) {
    reasons.push('independence-audit-not-eligible-for-negative-decision');
  } else if (modelBrier > benchmarkBrier && lower > 0) {
    verdict = 'probability-claim-rejected';
    reasons.push('paired-brier-delta-ci95-entirely-above-zero');
  } else if (upper < 0) {
    verdict = 'retrospective-support-only';
    reasons.push('paired-brier-delta-ci95-entirely-below-zero');
  } else {
    reasons.push('paired-brier-delta-ci95-crosses-zero');
  }
  return Object.freeze({
    schemaVersion: 1,
    campaignId: protocol.campaignId,
    protocolFingerprint: protocol.fingerprint,
    verdict,
    reasons: Object.freeze(reasons),
    modelBrier,
    benchmarkBrier,
    pairedBrierDeltaCi95: Object.freeze({ lower, upper }),
    mayValidateProbabilityClaim: false,
    mayExposeRealWorldProbability: false
  });
}
