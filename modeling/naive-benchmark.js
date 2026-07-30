export function fitBaseRateBenchmark(trainingObservations, horizon = '3m') {
  const labels = trainingObservations
    .map(row => row.labels?.[horizon]?.positiveReturn)
    .filter(value => typeof value === 'boolean');
  if (!labels.length) throw new Error(`Aucun label disponible pour l'horizon ${horizon}.`);
  const probability = labels.filter(Boolean).length / labels.length;
  return { model: 'base-rate', horizon, probability, sampleSize: labels.length };
}

export function predictBaseRate(model, observations) {
  return observations.map(row => ({ asOf: row.asOf, probability: model.probability }));
}

export function brierScore(predictions, observations, horizon = '3m') {
  const byDate = new Map(observations.map(row => [row.asOf, row.labels?.[horizon]?.positiveReturn]));
  const scored = predictions.flatMap(prediction => {
    const outcome = byDate.get(prediction.asOf);
    if (typeof outcome !== 'boolean') return [];
    const p = Number(prediction.probability);
    if (!Number.isFinite(p) || p < 0 || p > 1) return [];
    return [(p - Number(outcome)) ** 2];
  });
  if (!scored.length) return null;
  return scored.reduce((a, b) => a + b, 0) / scored.length;
}
