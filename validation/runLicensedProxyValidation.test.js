import test from 'node:test';
import assert from 'node:assert/strict';
import { runLicensedBeginnerProxyValidation } from './runLicensedProxyValidation.js';
import { BEGINNER_PROXY_VALIDATION_PLAN_V1 } from './portfolioIndependentWindowPlan.js';

function buildSeries(multiplier) {
  const points = [];
  for (const window of BEGINNER_PROXY_VALIDATION_PLAN_V1.windows) {
    points.push({ date: window.startDate, availableAt: window.startDate, price: 100 });
    points.push({ date: window.endDate, availableAt: window.endDate, price: 100 * multiplier });
  }
  return points;
}

const worldProxy = Object.freeze({ validationEligible: true, series: Object.freeze(buildSeries(1.10)) });
const paej = Object.freeze({ validationEligible: true, series: Object.freeze(buildSeries(1.04)) });

test('exécute toutes les fenêtres préenregistrées avec des séries licenciées', () => {
  const result = runLicensedBeginnerProxyValidation({ worldProxy, paej });
  assert.equal(result.windows.length, BEGINNER_PROXY_VALIDATION_PLAN_V1.windows.length);
  assert.equal(result.status, 'licensed-proxy-validation-results');
  assert.ok(result.windows.every(window => window.finalValue > 10000));
});

test('refuse une série non admissible à la validation', () => {
  assert.throws(() => runLicensedBeginnerProxyValidation({ worldProxy: { ...worldProxy, validationEligible: false }, paej }), /validationEligible/);
});

test('refuse une fenêtre sans couverture commune suffisante', () => {
  const incomplete = Object.freeze({ validationEligible: true, series: Object.freeze(worldProxy.series.slice(0, 2)) });
  assert.throws(() => runLicensedBeginnerProxyValidation({ worldProxy: incomplete, paej }), /couverture commune insuffisante/);
});
