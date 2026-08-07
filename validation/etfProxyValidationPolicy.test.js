import test from 'node:test';
import assert from 'node:assert/strict';
import { BEGINNER_ETF_PROXY_POLICY_V1 } from './etfProxyValidationPolicy.js';

test('la politique identifie IWDA comme proxy explicite et PAEJ comme instrument exact', () => {
  const iwda = BEGINNER_ETF_PROXY_POLICY_V1.portfolio.find(item => item.role === 'wpeaProxy');
  const paej = BEGINNER_ETF_PROXY_POLICY_V1.portfolio.find(item => item.role === 'paejExact');
  assert.equal(iwda.ticker, 'IWDA.AS');
  assert.equal(iwda.isin, 'IE00B4L5Y983');
  assert.equal(paej.ticker, 'PAEJ.PA');
  assert.equal(paej.isin, 'FR0011869312');
});

test('la politique interdit toute promotion en validation officielle MSCI', () => {
  assert.equal(BEGINNER_ETF_PROXY_POLICY_V1.evidenceTier, 'supporting-empirical-evidence');
  assert.ok(BEGINNER_ETF_PROXY_POLICY_V1.scientificClaimsForbidden.includes('validation officielle du MSCI World'));
});
