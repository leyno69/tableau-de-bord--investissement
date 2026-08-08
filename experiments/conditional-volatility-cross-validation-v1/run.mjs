import { mkdir, writeFile } from 'node:fs/promises';
import { runHistoricalReplay } from '../../validation/portfolioHistoricalReplayEngine.js';

const SYMBOLS = Object.freeze({ world: 'IWDA.AS', asia: 'PAEJ.PA' });
const ALLOCATION = Object.freeze([
  Object.freeze({ ticker: 'WORLD', weight: 0.50 }),
  Object.freeze({ ticker: 'ASIA', weight: 0.15 }),
  Object.freeze({ ticker: 'CASH', weight: 0.35 })
]);
const LAMBDA_GRID = Object.freeze([0.90, 0.94, 0.97]);
const FOLDS = Object.freeze([
  Object.freeze({ id: 'fold-1', trainEnd: '2017-12-31', validationStart: '2018-01-01', validationEnd: '2019-12-31' }),
  Object.freeze({ id: 'fold-2', trainEnd: '2019-12-31', validationStart: '2020-01-01', validationEnd: '2021-12-31' }),
  Object.freeze({ id: 'fold-3', trainEnd: '2021-12-31', validationStart: '2022-01-01', validationEnd: '2023-12-31' })
]);

function unix(date) { return Math.floor(Date.parse(`${date}T00:00:00Z`) / 1000); }
async function fetchAdjustedDaily(symbol, start, end) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${unix(start)}&period2=${unix(end)+86400}&interval=1d&events=div%2Csplits&includeAdjustedClose=true`;
  const response = await fetch(url, { headers: { 'user-agent': 'LEYNOR-conditional-volatility-cross-validation/1.0' } });
  if (!response.ok) throw new Error(`${symbol}: HTTP ${response.status}`);
  const payload = await response.json();
  const result = payload?.chart?.result?.[0];
  const adjusted = result?.indicators?.adjclose?.[0]?.adjclose;
  if (!result || !Array.isArray(result.timestamp) || !Array.isArray(adjusted)) throw new Error(`${symbol}: réponse invalide`);
  return result.timestamp.map((timestamp, index) => ({ date: new Date(timestamp*1000).toISOString().slice(0,10), availableAt: new Date(timestamp*1000).toISOString().slice(0,10), price: adjusted[index] })).filter(point => Number.isFinite(point.price));
}
function commonDates(a,b) { const set = new Set(b.map(x=>x.date)); return a.map(x=>x.date).filter(date=>set.has(date)).sort(); }
function monthEndReturns(valuePath) {
  const map = new Map();
  for (const point of valuePath) map.set(point.date.slice(0,7), point.value);
  const entries = [...map.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
  return entries.slice(1).map((entry,i)=>({ month: entry[0], value: entry[1]/entries[i][1]-1 }));
}
function mean(values) { return values.reduce((s,x)=>s+x,0)/values.length; }
function sampleVariance(values) { const m=mean(values); return values.reduce((s,x)=>s+(x-m)**2,0)/(values.length-1); }
function gaussianStepNll(x, mu, variance) { const v=Math.max(variance,1e-12); return 0.5*(Math.log(2*Math.PI*v)+((x-mu)**2)/v); }
function constantNll(values, mu, variance) { return values.reduce((s,x)=>s+gaussianStepNll(x,mu,variance),0); }
function ewmaNll(values, mu, initialVariance, lambda) {
  let variance=Math.max(initialVariance,1e-12); let total=0;
  for (const x of values) {
    total += gaussianStepNll(x,mu,variance);
    const innovation=(x-mu)**2;
    variance=lambda*variance+(1-lambda)*innovation;
  }
  return { nll: total, finalVariance: variance };
}
async function buildSeries() {
  const [world,asia]=await Promise.all([fetchAdjustedDaily(SYMBOLS.world,'2014-06-02','2023-12-31'),fetchAdjustedDaily(SYMBOLS.asia,'2014-06-02','2023-12-31')]);
  const dates=commonDates(world,asia); const cash=dates.map(date=>({date,availableAt:date,price:1}));
  const replay=runHistoricalReplay({ replayId:'conditional-volatility-source-v1', initialCash:10000, allocation:ALLOCATION, costPolicy:{transactionCostBps:0,exemptTickers:['CASH']}, seriesByTicker:{WORLD:world,ASIA:asia,CASH:cash}, startDate:dates[0], endDate:dates.at(-1), contributions:[], rebalanceDates:[] });
  return monthEndReturns(replay.valuePath);
}
function valuesBetween(series,start,end){return series.filter(x=>x.month>=start.slice(0,7)&&x.month<=end.slice(0,7)).map(x=>x.value);}

export async function runConditionalVolatilityCrossValidationV1(){
  const series=await buildSeries(); const folds=[];
  for(const fold of FOLDS){
    const training=series.filter(x=>x.month<=fold.trainEnd.slice(0,7)).map(x=>x.value);
    const validation=valuesBetween(series,fold.validationStart,fold.validationEnd);
    const mu=mean(training); const variance=sampleVariance(training);
    const candidates=LAMBDA_GRID.map(lambda=>({lambda,...ewmaNll(training,mu,variance,lambda)})).sort((a,b)=>a.nll-b.nll);
    const selected=candidates[0];
    const constantValidationNll=constantNll(validation,mu,variance);
    const ewmaValidation=ewmaNll(validation,mu,selected.finalVariance,selected.lambda);
    folds.push(Object.freeze({id:fold.id,trainingObservationCount:training.length,validationObservationCount:validation.length,selectedLambda:selected.lambda,constantValidationNll,ewmaValidationNll:ewmaValidation.nll,validationNllDeltaEwmaMinusConstant:ewmaValidation.nll-constantValidationNll,winner:ewmaValidation.nll<constantValidationNll?'ewma':'constant-volatility'}));
  }
  const ewmaWins=folds.filter(f=>f.winner==='ewma').length;
  return Object.freeze({schemaVersion:1,experimentId:'conditional-volatility-cross-validation-v1',status:'retrospective-temporal-cross-validation',lambdaGrid:LAMBDA_GRID,folds:Object.freeze(folds),aggregate:Object.freeze({ewmaWins,constantWins:folds.length-ewmaWins,totalValidationNllDeltaEwmaMinusConstant:folds.reduce((s,f)=>s+f.validationNllDeltaEwmaMinusConstant,0)}),interpretation:Object.freeze({verdict:null,decisionSignal:'Une amélioration EWMA cohérente sur plusieurs folds justifie seulement un prototype de simulation conditionnelle séparé.'}),limitations:Object.freeze(['Les périodes ne constituent pas un holdout vierge.','EWMA modélise la variance conditionnelle mais pas l’asymétrie ni les sauts.','La grille lambda est fixe et préenregistrée.'])});
}
if(import.meta.url===`file://${process.argv[1]}`){const result=await runConditionalVolatilityCrossValidationV1();await mkdir('artifacts',{recursive:true});await writeFile('artifacts/conditional-volatility-cross-validation-v1.json',`${JSON.stringify(result,null,2)}\n`,'utf8');process.stdout.write(`${JSON.stringify(result,null,2)}\n`);}
