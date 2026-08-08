import { mkdir, writeFile } from 'node:fs/promises';
import { simulateDca } from '../../portfolio-simulator.js';

const SYMBOL = 'IWDA.AS';
const INITIAL_AMOUNT = 3000;
const MONTHLY_AMOUNT = 150;
const MONTHS = 60;
const ANNUAL_RETURN = 0.07;
const WINDOWS = Object.freeze([
  Object.freeze({ id: '2010-2014', seedMonthEnd: '2009-12', firstContributionMonth: '2010-01', lastContributionMonth: '2014-12' }),
  Object.freeze({ id: '2015-2019', seedMonthEnd: '2014-12', firstContributionMonth: '2015-01', lastContributionMonth: '2019-12' }),
  Object.freeze({ id: '2020-2024', seedMonthEnd: '2019-12', firstContributionMonth: '2020-01', lastContributionMonth: '2024-12' })
]);

function unix(date) { return Math.floor(Date.parse(`${date}T00:00:00Z`) / 1000); }

async function fetchAdjustedDaily() {
  const start = '2009-12-01';
  const end = '2025-01-10';
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(SYMBOL)}?period1=${unix(start)}&period2=${unix(end)}&interval=1d&events=div%2Csplits&includeAdjustedClose=true`;
  const response = await fetch(url, { headers: { 'user-agent': 'LEYNOR-dca-empirical-validation/1.0' } });
  if (!response.ok) throw new Error(`${SYMBOL}: HTTP ${response.status}`);
  const payload = await response.json();
  const result = payload?.chart?.result?.[0];
  const adjusted = result?.indicators?.adjclose?.[0]?.adjclose;
  if (!result || !Array.isArray(result.timestamp) || !Array.isArray(adjusted)) throw new Error('réponse historique invalide');
  return result.timestamp.map((timestamp, index) => ({ date: new Date(timestamp*1000).toISOString().slice(0,10), price: adjusted[index] })).filter(point => Number.isFinite(point.price));
}

function monthEnds(series) {
  const map = new Map();
  for (const point of series) map.set(point.date.slice(0,7), point);
  return map;
}

function runHistoricalDca(monthEndMap, window) {
  const seed = monthEndMap.get(window.seedMonthEnd);
  if (!seed) throw new Error(`${window.id}: mois initial absent ${window.seedMonthEnd}`);
  let value = INITIAL_AMOUNT;
  let previousPrice = seed.price;
  const path = [];
  const startYear = Number(window.firstContributionMonth.slice(0,4));
  const startMonth = Number(window.firstContributionMonth.slice(5,7));
  for (let step = 0; step < MONTHS; step += 1) {
    const absoluteMonth = (startYear * 12 + (startMonth - 1)) + step;
    const year = Math.floor(absoluteMonth / 12);
    const month = absoluteMonth % 12 + 1;
    const key = `${year}-${String(month).padStart(2,'0')}`;
    const point = monthEndMap.get(key);
    if (!point) throw new Error(`${window.id}: mois absent ${key}`);
    const marketReturn = point.price / previousPrice - 1;
    value = value * (1 + marketReturn) + MONTHLY_AMOUNT;
    path.push(Object.freeze({ month:key, marketReturn, value }));
    previousPrice = point.price;
  }
  return Object.freeze({ finalValue:value, contributed:INITIAL_AMOUNT + MONTHLY_AMOUNT*MONTHS, gain:value-(INITIAL_AMOUNT + MONTHLY_AMOUNT*MONTHS), path:Object.freeze(path) });
}

export async function runDcaEmpiricalValidationV1() {
  const daily = await fetchAdjustedDaily();
  const monthEndMap = monthEnds(daily);
  const projected = simulateDca({ initialAmount:INITIAL_AMOUNT, monthlyAmount:MONTHLY_AMOUNT, months:MONTHS, annualReturn:ANNUAL_RETURN });
  const windows = WINDOWS.map(window => {
    const historical = runHistoricalDca(monthEndMap, window);
    return Object.freeze({
      id:window.id,
      historical:Object.freeze({finalValue:historical.finalValue,contributed:historical.contributed,gain:historical.gain}),
      deterministicProjection:Object.freeze({finalValue:projected.finalValue,contributed:projected.contributed,gain:projected.gain}),
      finalValueDelta:historical.finalValue-projected.finalValue,
      relativeFinalValueErrorVsProjection:(historical.finalValue-projected.finalValue)/projected.finalValue
    });
  });
  return Object.freeze({
    schemaVersion:1,
    experimentId:'dca-empirical-validation-v1',
    status:'supporting-empirical-evidence',
    source:Object.freeze({provider:'Yahoo Finance chart API',symbol:SYMBOL,licensedBenchmarkSource:false}),
    definition:Object.freeze({initialAmount:INITIAL_AMOUNT,monthlyAmount:MONTHLY_AMOUNT,months:MONTHS,annualReturn:ANNUAL_RETURN,contributionTiming:'after-month-return-at-month-end'}),
    windows:Object.freeze(windows),
    interpretation:Object.freeze({verdict:null,statement:'Les écarts mesurent la sensibilité de la projection déterministe à des séquences de marché réelles ; ils ne constituent pas une erreur prédictive calibrée.'}),
    limitations:Object.freeze(['IWDA.AS est utilisé comme proxy ETF Monde et non comme historique de WPEA.','Le calculateur DCA est déterministe et ne produit pas de distribution de probabilité.','Trois fenêtres de cinq ans ne suffisent pas à calibrer une probabilité de réussite.'])
  });
}

if(import.meta.url===`file://${process.argv[1]}`){const result=await runDcaEmpiricalValidationV1();await mkdir('artifacts',{recursive:true});await writeFile('artifacts/dca-empirical-validation-v1.json',`${JSON.stringify(result,null,2)}\n`,'utf8');process.stdout.write(`${JSON.stringify(result,null,2)}\n`);}
