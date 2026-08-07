function requiredObject(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${field} doit être un objet.`);
  }
  return value;
}

function integerAtLeast(value, minimum, field) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum) {
    throw new TypeError(`${field} doit être un entier supérieur ou égal à ${minimum}.`);
  }
  return number;
}

function ratio(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 1) {
    throw new TypeError(`${field} doit être compris entre 0 et 1.`);
  }
  return number;
}

function finiteNonNegative(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new TypeError(`${field} doit être un nombre fini positif ou nul.`);
  }
  return number;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

export function buildMethodologySynthesis({ sample, seedStability, sensitivity }) {
  const normalizedSample = requiredObject(sample, 'sample');
  const normalizedStability = requiredObject(seedStability, 'seedStability');
  const normalizedSensitivity = requiredObject(sensitivity, 'sensitivity');

  const observationCount = integerAtLeast(normalizedSample.observationCount, 1, 'sample.observationCount');
  const seedCount = integerAtLeast(normalizedSample.seedCount, 1, 'sample.seedCount');
  const expectedSeedCount = integerAtLeast(normalizedSample.expectedSeedCount, 1, 'sample.expectedSeedCount');
  if (seedCount > expectedSeedCount) {
    throw new TypeError('sample.seedCount ne peut pas dépasser sample.expectedSeedCount.');
  }

  const metricCoverage = ratio(normalizedSample.metricCoverage, 'sample.metricCoverage');
  const incompleteMetricCount = integerAtLeast(normalizedStability.incompleteMetricCount, 0, 'seedStability.incompleteMetricCount');
  const maximumCoefficientOfVariation = finiteNonNegative(
    normalizedStability.maximumCoefficientOfVariation,
    'seedStability.maximumCoefficientOfVariation'
  );
  const experimentCount = integerAtLeast(normalizedSensitivity.experimentCount, 0, 'sensitivity.experimentCount');
  const parameterCount = integerAtLeast(normalizedSensitivity.parameterCount, 0, 'sensitivity.parameterCount');
  if (parameterCount > experimentCount && experimentCount !== 0) {
    throw new TypeError('sensitivity.parameterCount ne peut pas dépasser sensitivity.experimentCount.');
  }

  const checks = [
    {
      id: 'sample-size',
      label: 'Taille d’échantillon',
      status: observationCount >= 1000 ? 'documented' : 'limited',
      value: observationCount,
      explanation: observationCount >= 1000
        ? 'La campagne contient au moins 1 000 observations.'
        : 'La campagne contient moins de 1 000 observations ; aucune robustesse statistique élevée ne peut être revendiquée.'
    },
    {
      id: 'seed-coverage',
      label: 'Couverture des graines',
      status: seedCount === expectedSeedCount ? 'documented' : 'incomplete',
      value: seedCount / expectedSeedCount,
      explanation: `${seedCount} graine(s) observée(s) sur ${expectedSeedCount} attendue(s).`
    },
    {
      id: 'metric-coverage',
      label: 'Couverture des métriques',
      status: metricCoverage === 1 && incompleteMetricCount === 0 ? 'documented' : 'incomplete',
      value: metricCoverage,
      explanation: `${Math.round(metricCoverage * 100)} % des métriques attendues sont couvertes ; ${incompleteMetricCount} métrique(s) restent incomplètes.`
    },
    {
      id: 'seed-dispersion',
      label: 'Dispersion entre graines',
      status: 'measured',
      value: maximumCoefficientOfVariation,
      explanation: 'La dispersion est mesurée et restituée, sans seuil de confiance arbitraire.'
    },
    {
      id: 'assumption-sensitivity',
      label: 'Sensibilité aux hypothèses',
      status: experimentCount > 0 && parameterCount > 0 ? 'measured' : 'missing',
      value: experimentCount,
      explanation: experimentCount > 0
        ? `${experimentCount} expérience(s) couvrent ${parameterCount} hypothèse(s).`
        : 'Aucune expérience de sensibilité exploitable n’est fournie.'
    }
  ];

  const blockers = checks
    .filter(check => check.status === 'incomplete' || check.status === 'missing')
    .map(check => check.id);
  const limitations = [
    'Cette synthèse décrit la documentation et la couverture disponibles ; elle ne constitue pas un niveau de confiance.',
    'Aucun seuil de dispersion n’est interprété comme bon ou mauvais sans validation empirique préalable.',
    'Une analyse un facteur à la fois ne mesure pas les interactions entre hypothèses.',
    'Cette synthèse ne constitue ni un niveau de preuve, ni un IGL, ni une recommandation d’investissement.'
  ];

  return deepFreeze({
    schemaVersion: 1,
    method: 'Synthèse descriptive de la couverture méthodologique LEYNOR.',
    observationCount,
    seedCoverage: seedCount / expectedSeedCount,
    metricCoverage,
    experimentCount,
    parameterCount,
    checks,
    blockers,
    isComplete: blockers.length === 0,
    limitations
  });
}
