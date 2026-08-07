function finite(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${field} doit être un nombre fini.`);
  return number;
}

function requiredText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} requis.`);
  return value.trim();
}

function orderedThresholds(thresholds, field) {
  if (!Array.isArray(thresholds) || thresholds.length === 0) throw new TypeError(`${field} doit contenir des seuils.`);
  let previous = -Infinity;
  return thresholds.map((item, index) => {
    const value = finite(item.value, `${field}[${index}].value`);
    if (value < previous) throw new TypeError(`${field} doit être ordonné par valeur croissante.`);
    previous = value;
    return Object.freeze({ label: String(item.label), value });
  });
}

export function locateAgainstThresholds(value, thresholds) {
  const observation = finite(value, 'value');
  const normalized = orderedThresholds(thresholds, 'thresholds');
  const first = normalized[0];
  if (observation < first.value) return Object.freeze({ band: `below-${first.label}`, lower: null, upper: first });
  for (let index = 1; index < normalized.length; index += 1) {
    const lower = normalized[index - 1];
    const upper = normalized[index];
    if (observation <= upper.value) return Object.freeze({ band: `${lower.label}-${upper.label}`, lower, upper });
  }
  const last = normalized.at(-1);
  return Object.freeze({ band: `above-${last.label}`, lower: last, upper: null });
}

export function diagnoseHistoricalCoverage({ simulation, historical }) {
  if (!simulation?.nominal || !simulation?.drawdown) throw new TypeError('simulation nominal/drawdown requise.');
  if (!historical || typeof historical !== 'object') throw new TypeError('historical requis.');

  const finalValue = finite(historical.finalValue, 'historical.finalValue');
  const drawdownMagnitude = Math.abs(finite(historical.maxDrawdown, 'historical.maxDrawdown'));
  const simulationSamplingFrequency = requiredText(simulation.drawdownSamplingFrequency, 'simulation.drawdownSamplingFrequency');
  const historicalSamplingFrequency = requiredText(historical.drawdownSamplingFrequency, 'historical.drawdownSamplingFrequency');

  const finalValueBand = locateAgainstThresholds(finalValue, [
    { label: 'p05', value: simulation.nominal.p05 },
    { label: 'p25', value: simulation.nominal.p25 },
    { label: 'median', value: simulation.nominal.median },
    { label: 'p75', value: simulation.nominal.p75 },
    { label: 'p95', value: simulation.nominal.p95 }
  ]);

  const comparableDrawdown = simulationSamplingFrequency === historicalSamplingFrequency;
  const drawdownBand = comparableDrawdown ? locateAgainstThresholds(drawdownMagnitude, [
    { label: 'median', value: simulation.drawdown.median },
    { label: 'p95', value: simulation.drawdown.p95 },
    { label: 'maximum', value: simulation.drawdown.maximum }
  ]) : null;

  return Object.freeze({
    schemaVersion: 2,
    finalValue: Object.freeze({ observed: finalValue, ...finalValueBand }),
    drawdown: comparableDrawdown
      ? Object.freeze({ observedMagnitude: drawdownMagnitude, comparable: true, samplingFrequency: historicalSamplingFrequency, ...drawdownBand })
      : Object.freeze({
          observedMagnitude: drawdownMagnitude,
          comparable: false,
          band: null,
          historicalSamplingFrequency,
          simulationSamplingFrequency,
          reason: 'sampling-frequency-mismatch'
        }),
    interpretation: Object.freeze({
      classification: 'descriptive-location-only',
      verdict: null,
      statement: comparableDrawdown
        ? 'La position dans les bandes simulées est descriptive et ne constitue ni un test de conformité ni une preuve de calibration.'
        : 'Le drawdown n’est pas positionné dans les bandes simulées car sa fréquence d’observation n’est pas compatible avec celle de la simulation.'
    })
  });
}
