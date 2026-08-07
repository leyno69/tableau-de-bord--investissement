function assertFinite(value, name) {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function rmse(predictions, observations) {
  const squared = predictions.map((prediction, index) => {
    const error = prediction - observations[index];
    return error * error;
  });
  return Math.sqrt(mean(squared));
}

function mae(predictions, observations) {
  return mean(predictions.map((prediction, index) => Math.abs(prediction - observations[index])));
}

export function evaluateCalibrationModel(model, validationRows) {
  if (!model?.modelId || typeof model.predict !== 'function') {
    throw new TypeError('model requires modelId and predict');
  }
  if (!Array.isArray(validationRows) || validationRows.length === 0) {
    throw new RangeError('validationRows must be a non-empty array');
  }

  const observations = [];
  const predictions = [];
  for (const row of validationRows) {
    assertFinite(row.outcome, 'outcome');
    const prediction = model.predict(Object.freeze({ ...row.features }));
    assertFinite(prediction, 'prediction');
    observations.push(row.outcome);
    predictions.push(prediction);
  }

  const observedMean = mean(observations);
  const totalVariance = mean(observations.map((value) => (value - observedMean) ** 2));
  const modelRmse = rmse(predictions, observations);
  const modelMae = mae(predictions, observations);
  const residualVariance = mean(predictions.map((prediction, index) => (prediction - observations[index]) ** 2));
  const explainedVariance = totalVariance === 0 ? 0 : 1 - residualVariance / totalVariance;

  return Object.freeze({
    modelId: model.modelId,
    rowCount: validationRows.length,
    rmse: modelRmse,
    mae: modelMae,
    explainedVariance,
    predictions: Object.freeze(predictions),
    observations: Object.freeze(observations),
  });
}

export function rankCalibrationModels(models, validationRows, options = {}) {
  if (!Array.isArray(models) || models.length === 0) {
    throw new RangeError('models must be a non-empty array');
  }
  const maximumRmse = options.maximumRmse ?? Number.POSITIVE_INFINITY;
  const minimumExplainedVariance = options.minimumExplainedVariance ?? 0;
  assertFinite(maximumRmse, 'maximumRmse');
  assertFinite(minimumExplainedVariance, 'minimumExplainedVariance');

  const evaluations = models.map((model) => evaluateCalibrationModel(model, validationRows));
  const ranked = evaluations
    .map((evaluation) => Object.freeze({
      ...evaluation,
      eligible: evaluation.rmse <= maximumRmse
        && evaluation.explainedVariance >= minimumExplainedVariance,
    }))
    .sort((a, b) => a.rmse - b.rmse || b.explainedVariance - a.explainedVariance || a.modelId.localeCompare(b.modelId));

  return Object.freeze({
    ranked: Object.freeze(ranked),
    selectedModelId: ranked[0]?.eligible ? ranked[0].modelId : null,
    notice: 'Selection is experimental only and does not authorize a production IGL score or weight.',
  });
}

export function createLinearCandidate(modelId, coefficients, intercept = 0) {
  if (!modelId || !coefficients || typeof coefficients !== 'object') {
    throw new TypeError('modelId and coefficients are required');
  }
  for (const [name, value] of Object.entries(coefficients)) assertFinite(value, `coefficient.${name}`);
  assertFinite(intercept, 'intercept');
  return Object.freeze({
    modelId,
    predict(features) {
      return Object.entries(coefficients).reduce((sum, [name, coefficient]) => {
        const featureValue = features[name] ?? 0;
        assertFinite(featureValue, `feature.${name}`);
        return sum + coefficient * featureValue;
      }, intercept);
    },
  });
}
