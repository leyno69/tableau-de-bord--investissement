import { createMassSimulationDefinition } from './leynor-premium-lab.js';

const MATRIX_TOLERANCE = 1e-10;

function finite(value, name, { min = -Infinity, max = Infinity } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new TypeError(`${name} doit être compris entre ${min} et ${max}.`);
  }
  return number;
}

function createSeededRandom(seed = 1) {
  let state = (Number(seed) >>> 0) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function normal(random) {
  const u1 = Math.max(random(), Number.EPSILON);
  const u2 = random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function percentile(sorted, probability) {
  const index = (sorted.length - 1) * probability;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function cholesky(matrix) {
  const size = matrix.length;
  const lower = Array.from({ length: size }, () => Array(size).fill(0));

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column <= row; column += 1) {
      let residual = matrix[row][column];
      for (let index = 0; index < column; index += 1) {
        residual -= lower[row][index] * lower[column][index];
      }

      if (row === column) {
        if (residual < -MATRIX_TOLERANCE) {
          throw new RangeError('correlationMatrix doit être positive semi-définie.');
        }
        lower[row][column] = Math.sqrt(Math.max(0, residual));
      } else if (Math.abs(lower[column][column]) <= MATRIX_TOLERANCE) {
        if (Math.abs(residual) > MATRIX_TOLERANCE) {
          throw new RangeError('correlationMatrix doit être positive semi-définie.');
        }
        lower[row][column] = 0;
      } else {
        lower[row][column] = residual / lower[column][column];
      }
    }
  }

  return Object.freeze(lower.map(row => Object.freeze(row)));
}

export function normalizeCorrelationMatrix(matrix, assetCount) {
  if (!Array.isArray(matrix) || matrix.length !== assetCount) {
    throw new TypeError(`correlationMatrix doit contenir ${assetCount} lignes.`);
  }

  const normalized = matrix.map((row, rowIndex) => {
    if (!Array.isArray(row) || row.length !== assetCount) {
      throw new TypeError(`correlationMatrix[${rowIndex}] doit contenir ${assetCount} valeurs.`);
    }
    return row.map((value, columnIndex) => finite(
      value,
      `correlationMatrix[${rowIndex}][${columnIndex}]`,
      { min: -1, max: 1 }
    ));
  });

  for (let row = 0; row < assetCount; row += 1) {
    if (Math.abs(normalized[row][row] - 1) > MATRIX_TOLERANCE) {
      throw new RangeError('La diagonale de correlationMatrix doit être égale à 1.');
    }
    for (let column = row + 1; column < assetCount; column += 1) {
      if (Math.abs(normalized[row][column] - normalized[column][row]) > MATRIX_TOLERANCE) {
        throw new RangeError('correlationMatrix doit être symétrique.');
      }
    }
  }

  cholesky(normalized);
  return Object.freeze(normalized.map(row => Object.freeze(row)));
}

export function createCorrelatedSimulationDefinition({ correlationMatrix, ...input } = {}) {
  const base = createMassSimulationDefinition(input);
  const normalizedMatrix = normalizeCorrelationMatrix(correlationMatrix, base.allocation.length);
  return Object.freeze({ ...base, correlationMatrix: normalizedMatrix });
}

function correlatedNormals(lower, random) {
  const independent = lower.map(() => normal(random));
  return lower.map((row, rowIndex) => row
    .slice(0, rowIndex + 1)
    .reduce((sum, coefficient, columnIndex) => sum + coefficient * independent[columnIndex], 0));
}

function simulateOne(definition, lower, random) {
  const months = definition.years * 12;
  let nominalValue = definition.initialAmount;
  let peak = nominalValue;
  let maxDrawdown = 0;

  for (let month = 0; month < months; month += 1) {
    const shocks = correlatedNormals(lower, random);
    const portfolioReturn = definition.allocation.reduce((sum, asset, index) => {
      const monthlyMean = Math.pow(1 + asset.annualReturn, 1 / 12) - 1;
      const monthlyVolatility = asset.annualVolatility / Math.sqrt(12);
      return sum + asset.weight * (monthlyMean + monthlyVolatility * shocks[index]);
    }, 0);

    nominalValue = Math.max(
      0,
      nominalValue * (1 + portfolioReturn - definition.annualFees / 12) + definition.monthlyContribution
    );
    peak = Math.max(peak, nominalValue);
    if (peak > 0) maxDrawdown = Math.max(maxDrawdown, (peak - nominalValue) / peak);
  }

  return Object.freeze({
    finalValue: nominalValue,
    realFinalValue: nominalValue / Math.pow(1 + definition.annualInflation, definition.years),
    maxDrawdown,
    reachedGoal: definition.goal == null ? null : nominalValue >= definition.goal
  });
}

export function runCorrelatedMassSimulation(input) {
  const definition = input?.correlationMatrix && !Object.isFrozen(input)
    ? createCorrelatedSimulationDefinition(input)
    : input;
  if (!definition?.correlationMatrix || !Object.isFrozen(definition)) {
    throw new TypeError('Une définition de simulation corrélée valide est requise.');
  }

  const lower = cholesky(definition.correlationMatrix);
  const random = createSeededRandom(definition.seed);
  const results = Array.from(
    { length: definition.portfolioCount },
    () => simulateOne(definition, lower, random)
  );
  const finalValues = results.map(result => result.finalValue).sort((a, b) => a - b);
  const realValues = results.map(result => result.realFinalValue).sort((a, b) => a - b);
  const drawdowns = results.map(result => result.maxDrawdown).sort((a, b) => a - b);
  const goalHits = definition.goal == null ? null : results.filter(result => result.reachedGoal).length;

  return Object.freeze({
    definition,
    summary: Object.freeze({
      portfolioCount: definition.portfolioCount,
      contributed: definition.initialAmount + definition.monthlyContribution * definition.years * 12,
      nominal: Object.freeze({
        p05: percentile(finalValues, 0.05),
        median: percentile(finalValues, 0.5),
        p95: percentile(finalValues, 0.95),
        minimum: finalValues[0],
        maximum: finalValues.at(-1)
      }),
      realMedian: percentile(realValues, 0.5),
      drawdown: Object.freeze({
        median: percentile(drawdowns, 0.5),
        p95: percentile(drawdowns, 0.95),
        maximum: drawdowns.at(-1)
      }),
      goalProbability: goalHits == null ? null : goalHits / definition.portfolioCount
    }),
    methodology: Object.freeze({
      model: 'Monte-Carlo mensuel gaussien corrélé à graine reproductible',
      correlationStatement: 'Les chocs sont reliés par une matrice de corrélation validée, symétrique et positive semi-définie.',
      interpretationWarning: 'La corrélation saisie est une hypothèse de modèle et ne prédit pas les relations futures entre actifs.'
    })
  });
}
