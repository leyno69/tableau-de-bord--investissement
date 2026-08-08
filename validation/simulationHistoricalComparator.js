function finite(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${field} doit être un nombre fini.`);
  return number;
}

function nonNegativeInteger(value, field) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) throw new TypeError(`${field} doit être un entier >= 0.`);
  return number;
}

function text(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} requis.`);
  return value.trim();
}

function relativeError(observed, expected) {
  if (expected === 0) return observed === 0 ? 0 : null;
  return (observed - expected) / Math.abs(expected);
}

function compareMetric(name, historicalValue, simulatedValue) {
  const historical = finite(historicalValue, `historical.${name}`);
  const simulated = finite(simulatedValue, `simulation.${name}`);
  return Object.freeze({
    metric: name,
    historical,
    simulated,
    delta: historical - simulated,
    relativeErrorVsSimulation: relativeError(historical, simulated)
  });
}

// Un drawdown est, par convention dans ce module (voir portfolioHistoricalMetrics.js
// et les fixtures de test ci-contre), exprimé en valeur négative ou nulle des
// deux côtés. Certaines sources (le moteur Monte Carlo `leynor-premium-lab.js`)
// exposent au contraire une magnitude positive : les brancher sans conversion
// ici doublerait ou inverserait silencieusement l'écart calculé. On refuse
// donc explicitement toute valeur strictement positive plutôt que de risquer
// une comparaison corrompue sans erreur.
function compareMaxDrawdown(historicalValue, simulatedValue) {
  const historical = finite(historicalValue, 'historical.maxDrawdown');
  const simulated = finite(simulatedValue, 'simulation.maxDrawdown');
  if (historical > 0 || simulated > 0) {
    throw new TypeError(
      'maxDrawdown doit être exprimé en valeur négative ou nulle des deux côtés (convention de ce module) ; une valeur positive a été fournie — vérifier la source avant de la convertir.'
    );
  }
  return Object.freeze({
    metric: 'maxDrawdown',
    historical,
    simulated,
    delta: historical - simulated,
    relativeErrorVsSimulation: relativeError(historical, simulated)
  });
}

export function compareSimulationToHistorical({ snapshot, historicalMetrics }) {
  if (!snapshot || typeof snapshot !== 'object') throw new TypeError('snapshot requis.');
  if (!historicalMetrics || typeof historicalMetrics !== 'object') throw new TypeError('historicalMetrics requis.');

  const comparisons = Object.freeze([
    compareMetric('return', historicalMetrics.cumulativeReturn, snapshot.returnMean),
    compareMetric('volatility', historicalMetrics.annualizedVolatility, snapshot.volatilityMean),
    compareMaxDrawdown(historicalMetrics.maxDrawdown, snapshot.maxDrawdownMean)
  ]);

  const historicalRecoveryDays = historicalMetrics.recovery?.recoveryDaysFromTrough;
  const simulatedRecoveryDays = finite(snapshot.recoveryDurationMeanDays, 'snapshot.recoveryDurationMeanDays');
  const recovery = Object.freeze({
    historicalRecovered: historicalMetrics.recovery?.recovered === true,
    historicalRecoveryDays: historicalRecoveryDays == null ? null : nonNegativeInteger(historicalRecoveryDays, 'historicalMetrics.recovery.recoveryDaysFromTrough'),
    simulatedRecoveryDays,
    deltaDays: historicalRecoveryDays == null ? null : historicalRecoveryDays - simulatedRecoveryDays
  });

  return Object.freeze({
    schemaVersion: 1,
    comparisonId: `${text(snapshot.snapshotId, 'snapshot.snapshotId')}::historical`,
    snapshotId: text(snapshot.snapshotId, 'snapshot.snapshotId'),
    campaignId: text(snapshot.campaignId, 'snapshot.campaignId'),
    historicalWindow: Object.freeze({
      startDate: text(historicalMetrics.startDate, 'historicalMetrics.startDate'),
      endDate: text(historicalMetrics.endDate, 'historicalMetrics.endDate'),
      durationDays: nonNegativeInteger(historicalMetrics.durationDays, 'historicalMetrics.durationDays')
    }),
    comparisons,
    recovery,
    interpretation: Object.freeze({
      classification: 'descriptive-only',
      calibratedThresholdsApplied: false,
      statement: 'Les écarts sont descriptifs. Aucun seuil de conformité, score de qualité ou verdict prédictif n’est appliqué sans calibration préenregistrée et validée hors échantillon.'
    }),
    limitations: Object.freeze([
      'Une réalisation historique unique ne constitue pas une distribution.',
      'Les métriques comparées doivent reposer sur des définitions compatibles avant toute interprétation.',
      'Une piste proxy mesure le proxy et non l’instrument réel.',
      'Cette comparaison ne démontre ni pouvoir prédictif ni rendement futur.'
    ])
  });
}
