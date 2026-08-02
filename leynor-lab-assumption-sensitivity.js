function requiredText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${field} doit être une chaîne non vide.`);
  }
  return value.trim();
}

function finiteNumber(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${field} doit être un nombre fini.`);
  return number;
}

function stableNumber(value) {
  if (value === null) return null;
  return Number.parseFloat(Number(value).toPrecision(15));
}

function normalizeNumericRecord(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${field} doit être un objet.`);
  }
  const entries = Object.entries(value);
  if (entries.length === 0) throw new TypeError(`${field} ne peut pas être vide.`);
  return Object.freeze(Object.fromEntries(entries
    .map(([key, entryValue]) => [requiredText(key, `${field}.clé`), finiteNumber(entryValue, `${field}.${key}`)])
    .sort(([left], [right]) => left.localeCompare(right))));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function relativeDelta(current, baseline) {
  return baseline === 0 ? null : stableNumber((current - baseline) / Math.abs(baseline));
}

function changedAssumptions(baseline, variant) {
  const baselineKeys = Object.keys(baseline);
  const variantKeys = Object.keys(variant);
  if (baselineKeys.length !== variantKeys.length || baselineKeys.some((key, index) => key !== variantKeys[index])) {
    throw new TypeError('Chaque variante doit fournir exactement les mêmes hypothèses que le scénario de référence.');
  }
  return baselineKeys.filter(key => baseline[key] !== variant[key]);
}

function normalizeScenario(input, field) {
  if (!input || typeof input !== 'object') throw new TypeError(`${field} doit être un objet.`);
  return Object.freeze({
    scenarioId: requiredText(input.scenarioId, `${field}.scenarioId`),
    assumptions: normalizeNumericRecord(input.assumptions, `${field}.assumptions`),
    metrics: normalizeNumericRecord(input.metrics, `${field}.metrics`)
  });
}

function ensureSameMetricSet(baseline, variant) {
  const baselineKeys = Object.keys(baseline);
  const variantKeys = Object.keys(variant);
  if (baselineKeys.length !== variantKeys.length || baselineKeys.some((key, index) => key !== variantKeys[index])) {
    throw new TypeError('Chaque variante doit fournir exactement les mêmes métriques que le scénario de référence.');
  }
}

export function analyzeAssumptionSensitivity({ baseline, variants }) {
  const reference = normalizeScenario(baseline, 'baseline');
  if (!Array.isArray(variants) || variants.length === 0) {
    throw new TypeError('variants doit contenir au moins une variante.');
  }

  const seenScenarioIds = new Set([reference.scenarioId]);
  const normalizedVariants = variants.map((input, index) => {
    const variant = normalizeScenario(input, `variants[${index}]`);
    if (seenScenarioIds.has(variant.scenarioId)) throw new Error(`scenarioId dupliqué : ${variant.scenarioId}.`);
    seenScenarioIds.add(variant.scenarioId);
    ensureSameMetricSet(reference.metrics, variant.metrics);
    const changed = changedAssumptions(reference.assumptions, variant.assumptions);
    if (changed.length !== 1) {
      throw new Error(`${variant.scenarioId} doit modifier exactement une hypothèse ; ${changed.length} modification(s) détectée(s).`);
    }
    return { variant, parameter: changed[0] };
  });

  const analyses = normalizedVariants.map(({ variant, parameter }) => {
    const baselineValue = reference.assumptions[parameter];
    const testedValue = variant.assumptions[parameter];
    const parameterRelativeDelta = relativeDelta(testedValue, baselineValue);
    const metrics = Object.keys(reference.metrics).map(metric => {
      const baselineMetric = reference.metrics[metric];
      const testedMetric = variant.metrics[metric];
      const metricRelativeDelta = relativeDelta(testedMetric, baselineMetric);
      const elasticity = parameterRelativeDelta === null || parameterRelativeDelta === 0 || metricRelativeDelta === null
        ? null
        : stableNumber(metricRelativeDelta / parameterRelativeDelta);
      return Object.freeze({
        metric,
        baselineValue: baselineMetric,
        testedValue: testedMetric,
        absoluteDelta: stableNumber(testedMetric - baselineMetric),
        relativeDelta: metricRelativeDelta,
        elasticity
      });
    });

    return Object.freeze({
      scenarioId: variant.scenarioId,
      parameter,
      baselineValue,
      testedValue,
      absoluteDelta: stableNumber(testedValue - baselineValue),
      relativeDelta: parameterRelativeDelta,
      metrics: Object.freeze(metrics)
    });
  }).sort((left, right) => left.parameter.localeCompare(right.parameter)
    || left.testedValue - right.testedValue
    || left.scenarioId.localeCompare(right.scenarioId));

  const byParameter = Object.keys(reference.assumptions).map(parameter => {
    const experiments = analyses.filter(entry => entry.parameter === parameter);
    return Object.freeze({
      parameter,
      experimentCount: experiments.length,
      testedValues: Object.freeze(experiments.map(entry => entry.testedValue)),
      experiments: Object.freeze(experiments)
    });
  }).filter(entry => entry.experimentCount > 0);

  return deepFreeze({
    schemaVersion: 1,
    method: 'Analyse de sensibilité un facteur à la fois (OAT).',
    baselineScenarioId: reference.scenarioId,
    baseline: reference,
    experimentCount: analyses.length,
    parametersTested: Object.freeze(byParameter.map(entry => entry.parameter)),
    byParameter: Object.freeze(byParameter),
    limitations: Object.freeze([
      'Une analyse un facteur à la fois ne mesure pas les interactions entre hypothèses.',
      'Les écarts observés décrivent uniquement les scénarios fournis et ne prédisent pas les marchés.',
      'Une élasticité n’est pas calculée lorsque la valeur de référence ou la variation relative est nulle.',
      'Cette analyse ne constitue ni un score de confiance, ni un niveau de preuve, ni un IGL.'
    ])
  });
}
