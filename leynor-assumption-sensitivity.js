import { runMassSimulation } from './leynor-premium-lab.js';
import { runCorrelatedMassSimulation } from './leynor-correlated-lab.js';

const MIN_VARIANTS = 2;
const MAX_VARIANTS = 20;
const ALLOWED_CHANGE_KEYS = new Set([
  'annualInflation',
  'annualFees',
  'returnMultiplier',
  'volatilityMultiplier',
  'correlationMultiplier'
]);

function requiredText(value, name) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${name} doit être une chaîne non vide.`);
  return value.trim();
}

function finite(value, name, { min = -Infinity, max = Infinity } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new TypeError(`${name} doit être compris entre ${min} et ${max}.`);
  }
  return number;
}

function normalizeChanges(changes, type, index) {
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
    throw new TypeError(`variants[${index}].changes est requis.`);
  }
  const keys = Object.keys(changes);
  if (keys.length === 0) throw new RangeError(`variants[${index}].changes ne peut pas être vide.`);
  for (const key of keys) {
    if (!ALLOWED_CHANGE_KEYS.has(key)) throw new RangeError(`Hypothèse inconnue : ${key}.`);
    if (key === 'correlationMultiplier' && type !== 'correlated') {
      throw new RangeError('correlationMultiplier exige une simulation corrélée.');
    }
  }
  return Object.freeze({
    annualInflation: changes.annualInflation == null ? null : finite(changes.annualInflation, `variants[${index}].changes.annualInflation`, { min: 0, max: 0.3 }),
    annualFees: changes.annualFees == null ? null : finite(changes.annualFees, `variants[${index}].changes.annualFees`, { min: 0, max: 0.2 }),
    returnMultiplier: changes.returnMultiplier == null ? 1 : finite(changes.returnMultiplier, `variants[${index}].changes.returnMultiplier`, { min: 0, max: 3 }),
    volatilityMultiplier: changes.volatilityMultiplier == null ? 1 : finite(changes.volatilityMultiplier, `variants[${index}].changes.volatilityMultiplier`, { min: 0, max: 3 }),
    correlationMultiplier: changes.correlationMultiplier == null ? 1 : finite(changes.correlationMultiplier, `variants[${index}].changes.correlationMultiplier`, { min: -1, max: 1 })
  });
}

function normalizeVariants(variants, type) {
  if (!Array.isArray(variants) || variants.length < MIN_VARIANTS || variants.length > MAX_VARIANTS) {
    throw new RangeError(`variants doit contenir entre ${MIN_VARIANTS} et ${MAX_VARIANTS} éléments.`);
  }
  const ids = new Set();
  return Object.freeze(variants.map((variant, index) => {
    const id = requiredText(variant?.id ?? `variant-${index + 1}`, `variants[${index}].id`);
    if (ids.has(id)) throw new RangeError(`Identifiant de variante dupliqué : ${id}.`);
    ids.add(id);
    return Object.freeze({
      id,
      label: requiredText(variant?.label ?? id, `variants[${index}].label`),
      changes: normalizeChanges(variant?.changes, type, index)
    });
  }));
}

function scaleCorrelationMatrix(matrix, multiplier) {
  return matrix.map((row, rowIndex) => row.map((value, columnIndex) => {
    if (rowIndex === columnIndex) return 1;
    return Math.max(-1, Math.min(1, value * multiplier));
  }));
}

function applyChanges(definition, changes, type) {
  const changed = {
    ...definition,
    annualInflation: changes.annualInflation ?? definition.annualInflation,
    annualFees: changes.annualFees ?? definition.annualFees,
    allocation: definition.allocation.map(asset => ({
      ...asset,
      annualReturn: asset.annualReturn * changes.returnMultiplier,
      annualVolatility: asset.annualVolatility * changes.volatilityMultiplier
    }))
  };
  if (type === 'correlated') {
    changed.correlationMatrix = scaleCorrelationMatrix(definition.correlationMatrix, changes.correlationMultiplier);
  }
  return changed;
}

function deltas(report, baseline) {
  const goal = report.summary.goalProbability;
  const baselineGoal = baseline.summary.goalProbability;
  return Object.freeze({
    nominalMedian: report.summary.nominal.median - baseline.summary.nominal.median,
    realMedian: report.summary.realMedian - baseline.summary.realMedian,
    drawdownP95: report.summary.drawdown.p95 - baseline.summary.drawdown.p95,
    goalProbability: goal == null || baselineGoal == null ? null : goal - baselineGoal
  });
}

export function analyzeAssumptionSensitivity({ type = 'independent', definition, variants } = {}) {
  if (type !== 'independent' && type !== 'correlated') throw new RangeError('type doit valoir independent ou correlated.');
  if (!definition || typeof definition !== 'object') throw new TypeError('definition est requise.');
  if (type === 'correlated' && !Array.isArray(definition.correlationMatrix)) {
    throw new TypeError('correlationMatrix est requise pour une simulation corrélée.');
  }

  const normalizedVariants = normalizeVariants(variants, type);
  const run = type === 'correlated' ? runCorrelatedMassSimulation : runMassSimulation;
  const baseline = run(definition);
  const results = normalizedVariants.map(variant => {
    const report = run(applyChanges(definition, variant.changes, type));
    return Object.freeze({
      id: variant.id,
      label: variant.label,
      changes: variant.changes,
      report,
      deltas: deltas(report, baseline)
    });
  });

  return Object.freeze({
    type,
    baseline,
    variants: normalizedVariants,
    results: Object.freeze(results),
    methodology: Object.freeze({
      statement: 'Chaque variante modifie une ou plusieurs hypothèses tout en conservant les autres paramètres et la graine du scénario de référence.',
      interpretation: 'Les écarts mesurent la sensibilité du modèle aux hypothèses saisies et ne constituent ni un classement ni une prévision.',
      limitation: 'Cette analyse ne démontre pas que les hypothèses testées décrivent les marchés futurs et ne produit aucun poids pour l’IGL.'
    })
  });
}

export { MAX_VARIANTS, MIN_VARIANTS };
