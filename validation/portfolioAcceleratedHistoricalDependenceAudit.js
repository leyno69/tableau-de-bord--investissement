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

function sha256(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function sha256Text(value, field) {
  const text = nonEmpty(value, field);
  if (!/^[a-f0-9]{64}$/i.test(text)) throw new TypeError(`${field} doit être une empreinte SHA-256.`);
  return text.toLowerCase();
}

function probability(value, field) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 1) throw new TypeError(`${field} doit être compris entre 0 et 1.`);
  return numeric;
}

function integer(value, field, minimum) {
  const numeric = Number(value);
  if (!Number.isSafeInteger(numeric) || numeric < minimum) throw new TypeError(`${field} doit être un entier >= ${minimum}.`);
  return numeric;
}

function createSeededRandom(seed) {
  let state = Number(seed) >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(sorted, level) {
  const index = (sorted.length - 1) * level;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function normalizeOffsets(values) {
  if (!Array.isArray(values) || values.length === 0) throw new TypeError('blockLengthSensitivityOffsets doit être un tableau non vide.');
  const offsets = values.map((value, index) => {
    const numeric = Number(value);
    if (!Number.isSafeInteger(numeric)) throw new TypeError(`blockLengthSensitivityOffsets[${index}] doit être un entier.`);
    return numeric;
  });
  if (!offsets.includes(0)) throw new TypeError('blockLengthSensitivityOffsets doit contenir 0.');
  return Object.freeze([...new Set(offsets)].sort((a, b) => a - b));
}

function deriveBlockLengths(windowCount, offsets) {
  const primary = Math.max(1, Math.ceil(windowCount ** 0.2));
  return Object.freeze([...new Set(offsets.map(offset => Math.min(windowCount, Math.max(1, primary + offset))))].sort((a, b) => a - b));
}

function circularMovingBlockMeans(values, blockLength, replicateCount, seed) {
  const random = createSeededRandom((seed + Math.imul(blockLength, 2654435761)) >>> 0);
  const results = new Array(replicateCount);
  for (let replicate = 0; replicate < replicateCount; replicate += 1) {
    let sum = 0;
    let sampled = 0;
    while (sampled < values.length) {
      const start = Math.floor(random() * values.length);
      for (let offset = 0; offset < blockLength && sampled < values.length; offset += 1) {
        sum += values[(start + offset) % values.length];
        sampled += 1;
      }
    }
    results[replicate] = sum / values.length;
  }
  return results.sort((a, b) => a - b);
}

export function createAcceleratedHistoricalDependenceMethod(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input doit être un objet.');
  const payload = {
    schemaVersion: 1,
    auditId: nonEmpty(input.auditId, 'auditId'),
    campaignId: nonEmpty(input.campaignId, 'campaignId'),
    registeredAt: isoUtc(input.registeredAt, 'registeredAt'),
    protocolFingerprint: sha256Text(input.protocolFingerprint, 'protocolFingerprint'),
    statistic: nonEmpty(input.statistic, 'statistic'),
    resamplingMethod: nonEmpty(input.resamplingMethod, 'resamplingMethod'),
    blockLengthRule: nonEmpty(input.blockLengthRule, 'blockLengthRule'),
    blockLengthSensitivityOffsets: normalizeOffsets(input.blockLengthSensitivityOffsets),
    confidenceLevel: Number(input.confidenceLevel),
    intervalType: nonEmpty(input.intervalType, 'intervalType'),
    bootstrapReplicates: integer(input.bootstrapReplicates, 'bootstrapReplicates', 10000),
    bootstrapSeed: integer(input.bootstrapSeed, 'bootstrapSeed', 0),
    minimumWindowCount: integer(input.minimumWindowCount, 'minimumWindowCount', 12),
    chronologicalOrderRequired: input.chronologicalOrderRequired === true,
    returnValuesAccessibleAtLock: input.returnValuesAccessibleAtLock === true,
    positiveDecisionAuthority: nonEmpty(input.positiveDecisionAuthority, 'positiveDecisionAuthority'),
    negativeDecisionAuthority: nonEmpty(input.negativeDecisionAuthority, 'negativeDecisionAuthority'),
    references: Object.freeze((input.references ?? []).map((value, index) => nonEmpty(value, `references[${index}]`)))
  };
  if (payload.statistic !== 'mean-paired-brier-loss-delta') throw new TypeError('statistic invalide.');
  if (payload.resamplingMethod !== 'circular-moving-block-bootstrap') throw new TypeError('resamplingMethod invalide.');
  if (payload.blockLengthRule !== 'ceil-n-power-one-fifth') throw new TypeError('blockLengthRule invalide.');
  if (payload.confidenceLevel !== 0.95) throw new TypeError('confidenceLevel doit rester fixé à 0.95.');
  if (payload.intervalType !== 'basic-bootstrap-two-sided-envelope') throw new TypeError('intervalType invalide.');
  if (!Number.isSafeInteger(payload.bootstrapSeed) || payload.bootstrapSeed > 0xffffffff) throw new TypeError('bootstrapSeed doit être un entier uint32.');
  if (!payload.chronologicalOrderRequired) throw new TypeError('chronologicalOrderRequired doit être true.');
  if (payload.returnValuesAccessibleAtLock) throw new TypeError('la méthode doit être verrouillée sans accès aux valeurs de rendement.');
  if (payload.positiveDecisionAuthority !== 'retrospective-support-only') throw new TypeError('positiveDecisionAuthority invalide.');
  if (payload.negativeDecisionAuthority !== 'may-reject-after-bound-dependence-audit') throw new TypeError('negativeDecisionAuthority invalide.');
  if (payload.references.length < 2) throw new TypeError('au moins deux références méthodologiques sont requises.');
  return Object.freeze({ ...payload, status: 'method-locked-before-return-values', fingerprint: sha256(payload) });
}

export function bindDependenceMethodToWindowRegistry(method, windowRegistry, bindingContext) {
  if (method?.status !== 'method-locked-before-return-values') throw new TypeError('méthode de dépendance verrouillée requise.');
  if (!windowRegistry?.fingerprint || !Array.isArray(windowRegistry.windows)) throw new TypeError('windowRegistry verrouillé requis.');
  if (!bindingContext || typeof bindingContext !== 'object' || Array.isArray(bindingContext)) throw new TypeError('bindingContext auditable requis.');
  if (windowRegistry.protocolFingerprint !== method.protocolFingerprint) throw new TypeError('windowRegistry et méthode ne partagent pas le même protocole.');
  if (windowRegistry.windows.length === 0) throw new TypeError('le registre doit contenir au moins une fenêtre issue des métadonnées.');
  const boundAt = isoUtc(bindingContext.boundAt, 'bindingContext.boundAt');
  if (Date.parse(boundAt) < Date.parse(method.registeredAt)) throw new TypeError('boundAt ne peut pas précéder le verrouillage de la méthode.');
  if (bindingContext.returnValuesAccessibleAtBinding !== false) throw new TypeError('la liaison doit être effectuée sans accès aux valeurs de rendement.');
  const orderedWindowIds = Object.freeze(windowRegistry.windows.map((window, index) => nonEmpty(window?.windowId, `windows[${index}].windowId`)));
  if (new Set(orderedWindowIds).size !== orderedWindowIds.length) throw new TypeError('les windowId du registre doivent être uniques.');
  const blockLengths = deriveBlockLengths(orderedWindowIds.length, method.blockLengthSensitivityOffsets);
  const payload = {
    schemaVersion: 1,
    auditId: method.auditId,
    campaignId: method.campaignId,
    methodFingerprint: method.fingerprint,
    protocolFingerprint: method.protocolFingerprint,
    windowRegistryFingerprint: sha256Text(windowRegistry.fingerprint, 'windowRegistry.fingerprint'),
    orderedWindowIds,
    windowCount: orderedWindowIds.length,
    primaryBlockLength: Math.max(1, Math.ceil(orderedWindowIds.length ** 0.2)),
    blockLengths,
    minimumWindowCount: method.minimumWindowCount,
    minimumWindowCountSatisfied: orderedWindowIds.length >= method.minimumWindowCount,
    boundAt,
    returnValuesAccessibleAtBinding: false,
    boundBeforeReturnValues: true
  };
  return Object.freeze({ ...payload, status: 'locked-before-return-values', fingerprint: sha256(payload) });
}

export function evaluateBoundDependenceAudit({ method, audit, records } = {}) {
  if (method?.status !== 'method-locked-before-return-values') throw new TypeError('méthode verrouillée requise.');
  if (audit?.status !== 'locked-before-return-values') throw new TypeError('audit lié au registre requis.');
  if (audit.methodFingerprint !== method.fingerprint) throw new TypeError('audit et méthode incompatibles.');
  if (!Array.isArray(records) || records.length !== audit.windowCount) throw new TypeError('records doit correspondre exactement au registre de fenêtres.');
  const deltas = [];
  const modelLosses = [];
  const benchmarkLosses = [];
  records.forEach((record, index) => {
    const windowId = nonEmpty(record?.windowId, `records[${index}].windowId`);
    if (windowId !== audit.orderedWindowIds[index]) throw new TypeError('records doit respecter l’ordre chronologique verrouillé du registre.');
    if (typeof record.binaryOutcome !== 'boolean') throw new TypeError(`records[${index}].binaryOutcome doit être booléen.`);
    const outcome = record.binaryOutcome ? 1 : 0;
    const modelProbability = probability(record.modelProbability, `records[${index}].modelProbability`);
    const benchmarkProbability = probability(record.benchmarkProbability, `records[${index}].benchmarkProbability`);
    const modelLoss = (modelProbability - outcome) ** 2;
    const benchmarkLoss = (benchmarkProbability - outcome) ** 2;
    modelLosses.push(modelLoss);
    benchmarkLosses.push(benchmarkLoss);
    deltas.push(modelLoss - benchmarkLoss);
  });
  const observedMean = mean(deltas);
  const alpha = 1 - method.confidenceLevel;
  const byBlockLength = audit.blockLengths.map(blockLength => {
    const bootstrapMeans = circularMovingBlockMeans(deltas, blockLength, method.bootstrapReplicates, method.bootstrapSeed);
    const bootstrapLower = percentile(bootstrapMeans, alpha / 2);
    const bootstrapUpper = percentile(bootstrapMeans, 1 - alpha / 2);
    return Object.freeze({
      blockLength,
      lower: 2 * observedMean - bootstrapUpper,
      upper: 2 * observedMean - bootstrapLower
    });
  });
  const envelope = Object.freeze({
    lower: Math.min(...byBlockLength.map(interval => interval.lower)),
    upper: Math.max(...byBlockLength.map(interval => interval.upper))
  });
  const eligible = audit.minimumWindowCountSatisfied;
  return Object.freeze({
    schemaVersion: 1,
    campaignId: method.campaignId,
    methodFingerprint: method.fingerprint,
    dependenceAuditFingerprint: audit.fingerprint,
    windowRegistryFingerprint: audit.windowRegistryFingerprint,
    windowCount: audit.windowCount,
    modelBrier: mean(modelLosses),
    benchmarkBrier: mean(benchmarkLosses),
    meanPairedBrierDelta: observedMean,
    pairedBrierDeltaCi95: envelope,
    intervalsByBlockLength: Object.freeze(byBlockLength),
    independenceAuditStatus: eligible ? 'eligible-for-negative-decision' : 'not-eligible-insufficient-window-count',
    campaignValid: true,
    limitations: Object.freeze([
      'block-bootstrap-is-asymptotic-not-proof-of-independence',
      ...(eligible ? [] : ['minimum-window-count-not-satisfied'])
    ])
  });
}
