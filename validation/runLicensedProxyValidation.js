import { runHistoricalReplay } from './portfolioHistoricalReplayEngine.js';
import { calculateReplayHistoricalMetrics } from './portfolioHistoricalMetrics.js';
import { assertNonOverlappingWindows, BEGINNER_PROXY_VALIDATION_PLAN_V1 } from './portfolioIndependentWindowPlan.js';

function licensedSeries(input, field) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError(`${field} requis.`);
  if (input.validationEligible !== true) throw new TypeError(`${field} doit être validationEligible.`);
  if (!Array.isArray(input.series) || input.series.length < 2) throw new TypeError(`${field}.series invalide.`);
  return input.series;
}

function priceOnDate(series, date) {
  return series.find(point => point.date === date)?.price ?? null;
}

function sliceWindow(series, startDate, endDate) {
  return series.filter(point => point.date >= startDate && point.date <= endDate);
}

export function runLicensedBeginnerProxyValidation({ worldProxy, paej, plan = BEGINNER_PROXY_VALIDATION_PLAN_V1 } = {}) {
  const worldSeries = licensedSeries(worldProxy, 'worldProxy');
  const paejSeries = licensedSeries(paej, 'paej');
  assertNonOverlappingWindows(plan.windows);
  const results = [];

  for (const window of plan.windows) {
    const worldWindow = sliceWindow(worldSeries, window.startDate, window.endDate);
    const paejWindow = sliceWindow(paejSeries, window.startDate, window.endDate);
    const commonDates = worldWindow.map(point => point.date).filter(date => priceOnDate(paejWindow, date) != null).sort();
    if (commonDates.length < 2) throw new Error(`${window.id}: couverture commune insuffisante.`);
    const startDate = commonDates[0];
    const endDate = commonDates.at(-1);
    const cash = commonDates.map(date => Object.freeze({ date, availableAt: date, price: 1 }));

    const replay = runHistoricalReplay({
      replayId: `${plan.planId}-${window.id}`,
      initialCash: 10000,
      allocation: plan.allocation,
      costPolicy: plan.costPolicy,
      seriesByTicker: { WPEA_PROXY: worldWindow, PAEJ: paejWindow, CASH: cash },
      startDate,
      endDate,
      contributions: [],
      rebalanceDates: []
    });
    const metrics = calculateReplayHistoricalMetrics(replay);
    results.push(Object.freeze({
      windowId: window.id,
      regimeTag: window.regimeTag,
      requestedWindow: Object.freeze({ startDate: window.startDate, endDate: window.endDate }),
      effectiveWindow: Object.freeze({ startDate, endDate, commonObservationCount: commonDates.length }),
      finalValue: replay.finalValue,
      totalCosts: replay.totalCosts,
      cumulativeReturn: metrics.cumulativeReturn,
      annualizedReturn: metrics.annualizedReturn,
      annualizedVolatility: metrics.annualizedVolatility,
      maxDrawdown: metrics.maxDrawdown,
      recovery: metrics.recovery
    }));
  }

  return Object.freeze({
    schemaVersion: 1,
    planId: plan.planId,
    status: 'licensed-proxy-validation-results',
    interpretation: plan.interpretation,
    windows: Object.freeze(results)
  });
}
