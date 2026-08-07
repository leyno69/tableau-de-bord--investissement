import { mkdir, writeFile } from 'node:fs/promises';
import { runHistoricalReplay } from '../../validation/portfolioHistoricalReplayEngine.js';

const SYMBOLS = Object.freeze({ world: 'IWDA.AS', asia: 'PAEJ.PA' });
const ALLOCATION = Object.freeze([
  Object.freeze({ ticker: 'WORLD', weight: 0.50 }),
  Object.freeze({ ticker: 'ASIA', weight: 0.15 }),
  Object.freeze({ ticker: 'CASH', weight: 0.35 })
]);
const DF_GRID = Object.freeze([4, 6, 8, 12, 20]);
const FOLDS = Object.freeze([
  Object.freeze({ id: 'fold-1', trainEnd: '2017-12-31', validationStart: '2018-01-01', validationEnd: '2019-12-31' }),
  Object.freeze({ id: 'fold-2', trainEnd: '2019-12-31', validationStart: '2020-01-01', validationEnd: '2021-12-31' }),
  Object.freeze({ id: 'fold-3', trainEnd: '2021-12-31', validationStart: '2022-01-01', validationEnd: '2023-12-31' })
]);

function unix(date) { return Math.floor(Date.parse(`${date}T00:00:00Z`) / 1000); }

async function fetchAdjustedDaily(symbol, start, end) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${unix(start)}&period2=${unix(end)+86400}&interval=1d&events=div%2Csplits&includeAdjustedClose=true`;
  const response = await fetch(url, { headers: { 'user-agent': 'LEYNOR-heavy-tail-cross-validation/1.0' } });
  if (!response.ok) throw new Error(`${symbol}: HTTP ${response.status}`);
  const payload = await response.json();
  const result = payload?.chart?.result?.[0];
  const adjusted = result?.indicators?.adjclose?.[0]?.adjclose;
  if (!result || !Array.isArray(result.timestamp) || !Array.isArray(adjusted)) throw new Error(`${symbol}: réponse invalide`);
  return result.timestamp.map((timestamp, index) => ({ date: new Date(timestamp * 1000).toISOString().slice(0, 10), availableAt: new Date(timestamp * 1000).toISOString().slice(0, 10), price: adjusted[index] })).filter(point => Number.isFinite(point.price));
}

function commonDates(a, b) {
  const set = new Set(b.map(point => point.date));
  return a.map(point => point.date).filter(date => set.has(date)).sort();
}

function monthEndReturnsFromTrajectory(trajectory) {
  const monthEnd = new Map();
  for (const point of trajectory) monthEnd.set(point.date.slice(0, 7), point.portfolioValue);
  const entries = [...monthEnd.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const returns = [];
  for (let i = 1; i < entries.length; i += 1) returns.push({ month: entries[i][0], value: entries[i][1] / entries[i-1][1] - 1 });
  return returns;
}

function mean(values) { return values.reduce((sum, x) => sum + x, 0) / values.length; }
function sampleSd(values) {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((sum, x) => sum + (x-m)**2, 0) / (values.length - 1));
}

function logGamma(z) {
  const p = [0.99999999999980993,676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,12.507343278686905,-0.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI*z)) - logGamma(1-z);
  z -= 1;
  let x = p[0];
  for (let i = 1; i < p.length; i += 1) x += p[i] / (z+i);
  const t = z + 7.5;
  return 0.5*Math.log(2*Math.PI) + (z+0.5)*Math.log(t) - t + Math.log(x);
}

function gaussianNll(values, mu, sigma) {
  const s = Math.max(sigma, 1e-12);
  const c = 0.5*Math.log(2*Math.PI*s*s);
  return values.reduce((sum, x) => sum + c + ((x-mu)**2)/(2*s*s), 0);
}

function studentTNll(values, mu, sampleSigma, df) {
  const scale = Math.max(sampleSigma * Math.sqrt((df-2)/df), 1e-12);
  const logC = logGamma((df+1)/2) - logGamma(df/2) - 0.5*Math.log(df*Math.PI) - Math.log(scale);
  return values.reduce((sum, x) => {
    const z = (x-mu)/scale;
    return sum - logC + ((df+1)/2)*Math.log(1 + (z*z)/df);
  }, 0);
}

async function buildMonthlySeries() {
  const [world, asia] = await Promise.all([
    fetchAdjustedDaily(SYMBOLS.world, '2014-06-02', '2023-12-31'),
    fetchAdjustedDaily(SYMBOLS.asia, '2014-06-02', '2023-12-31')
  ]);
  const dates = commonDates(world, asia);
  const cash = dates.map(date => ({ date, availableAt: date, price: 1 }));
  const replay = runHistoricalReplay({
    replayId: 'heavy-tail-cross-validation-source-v1',
    initialCash: 10000,
    allocation: ALLOCATION,
    costPolicy: { transactionCostBps: 0, exemptTickers: ['CASH'] },
    seriesByTicker: { WORLD: world, ASIA: asia, CASH: cash },
    startDate: dates[0], endDate: dates.at(-1), contributions: [], rebalanceDates: []
  });
  return monthEndReturnsFromTrajectory(replay.trajectory);
}

function valuesBetween(series, startInclusive, endInclusive) {
  return series.filter(item => item.month >= startInclusive.slice(0,7) && item.month <= endInclusive.slice(0,7)).map(item => item.value);
}

export async function runHeavyTailCrossValidationV1() {
  const series = await buildMonthlySeries();
  const folds = [];
  for (const fold of FOLDS) {
    const training = series.filter(item => item.month <= fold.trainEnd.slice(0,7)).map(item => item.value);
    const validation = valuesBetween(series, fold.validationStart, fold.validationEnd);
    const mu = mean(training); const sigma = sampleSd(training);
    const gaussianTrainNll = gaussianNll(training, mu, sigma);
    const candidates = DF_GRID.map(df => ({ df, trainingNll: studentTNll(training, mu, sigma, df) })).sort((a,b) => a.trainingNll-b.trainingNll);
    const selected = candidates[0];
    const gaussianValidationNll = gaussianNll(validation, mu, sigma);
    const studentValidationNll = studentTNll(validation, mu, sigma, selected.df);
    folds.push(Object.freeze({
      id: fold.id,
      trainingObservationCount: training.length,
      validationObservationCount: validation.length,
      selectedStudentDf: selected.df,
      gaussianTrainingNll: gaussianTrainNll,
      studentTrainingNll: selected.trainingNll,
      gaussianValidationNll,
      studentValidationNll,
      validationNllDeltaStudentMinusGaussian: studentValidationNll - gaussianValidationNll,
      winner: studentValidationNll < gaussianValidationNll ? 'student-t' : 'gaussian'
    }));
  }
  const studentWins = folds.filter(fold => fold.winner === 'student-t').length;
  const totalDelta = folds.reduce((sum, fold) => sum + fold.validationNllDeltaStudentMinusGaussian, 0);
  return Object.freeze({
    schemaVersion: 1,
    experimentId: 'heavy-tail-cross-validation-v1',
    status: 'retrospective-temporal-cross-validation',
    dfGrid: DF_GRID,
    folds: Object.freeze(folds),
    aggregate: Object.freeze({ studentWins, gaussianWins: folds.length-studentWins, totalValidationNllDeltaStudentMinusGaussian: totalDelta }),
    interpretation: Object.freeze({
      verdict: null,
      rule: 'Un modèle alternatif ne peut être promu dans le moteur de production à partir de cette validation croisée rétrospective seule.',
      decisionSignal: 'Une amélioration Student-t cohérente sur plusieurs folds justifie uniquement un prototype expérimental séparé.'
    }),
    limitations: Object.freeze([
      'Les périodes ont déjà été observées dans d’autres analyses du projet : ce test est temporellement ordonné mais pas un holdout totalement vierge.',
      'Le degré de liberté Student-t est choisi sur une grille fixe préenregistrée.',
      'Le modèle alternatif conserve moyenne et variance estimées sur l’entraînement ; il ne modélise pas encore la volatilité conditionnelle.'
    ])
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runHeavyTailCrossValidationV1();
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/heavy-tail-cross-validation-v1.json', `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
