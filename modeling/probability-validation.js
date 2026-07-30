function validPair(prediction, outcome) {
  const p = Number(prediction);
  return Number.isFinite(p) && p >= 0 && p <= 1 && typeof outcome === 'boolean';
}

export function brierScorePairs(pairs = []) {
  const valid = pairs.filter(x => validPair(x.probability, x.outcome));
  if (!valid.length) return null;
  return valid.reduce((sum, x) => sum + (Number(x.probability) - Number(x.outcome)) ** 2, 0) / valid.length;
}

export function calibrationTable(pairs = [], binWidth = 0.1) {
  if (!(binWidth > 0 && binWidth <= 1)) throw new Error('binWidth doit être compris entre 0 et 1.');
  const valid = pairs.filter(x => validPair(x.probability, x.outcome));
  const bins = new Map();

  for (const item of valid) {
    const p = Number(item.probability);
    const index = Math.min(Math.floor(p / binWidth), Math.ceil(1 / binWidth) - 1);
    if (!bins.has(index)) bins.set(index, []);
    bins.get(index).push(item);
  }

  return [...bins.entries()].sort((a, b) => a[0] - b[0]).map(([index, items]) => {
    const meanProbability = items.reduce((sum, x) => sum + Number(x.probability), 0) / items.length;
    const observedFrequency = items.filter(x => x.outcome).length / items.length;
    return {
      lowerBound: index * binWidth,
      upperBound: Math.min(1, (index + 1) * binWidth),
      count: items.length,
      meanProbability,
      observedFrequency,
      absoluteCalibrationGap: Math.abs(meanProbability - observedFrequency)
    };
  });
}

export function expectedCalibrationError(pairs = [], binWidth = 0.1) {
  const table = calibrationTable(pairs, binWidth);
  const total = table.reduce((sum, bin) => sum + bin.count, 0);
  if (!total) return null;
  return table.reduce((sum, bin) => sum + (bin.count / total) * bin.absoluteCalibrationGap, 0);
}

export function validationSummary(pairs = [], { binWidth = 0.1 } = {}) {
  const valid = pairs.filter(x => validPair(x.probability, x.outcome));
  return {
    sampleSize: valid.length,
    brierScore: brierScorePairs(valid),
    calibrationError: expectedCalibrationError(valid, binWidth),
    calibration: calibrationTable(valid, binWidth)
  };
}

export function compareToBenchmark(modelSummary, benchmarkSummary) {
  if (modelSummary?.brierScore == null || benchmarkSummary?.brierScore == null) {
    return { beatsBenchmark: false, brierImprovement: null };
  }
  const improvement = benchmarkSummary.brierScore - modelSummary.brierScore;
  return { beatsBenchmark: improvement > 0, brierImprovement: improvement };
}
