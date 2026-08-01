import test from 'node:test';
import assert from 'node:assert/strict';
import { DAILY_RADAR_SLOTS, REFRESH_INTERVALS, nextDailyRadarRefresh, shouldAutoRefreshMarket } from '../../refresh-policy.js';

test('daily radar exposes four deterministic refresh slots', () => {
  assert.deepEqual(DAILY_RADAR_SLOTS.map(slot => `${slot.hour}:${slot.minute}`), ['8:0', '12:30', '17:45', '22:15']);
});

test('next radar refresh selects the next local slot', () => {
  const next = nextDailyRadarRefresh(new Date('2026-08-01T13:00:00+02:00'));
  assert.equal(next.label, 'Clôture Europe');
  assert.equal(next.at.getHours(), 17);
  assert.equal(next.at.getMinutes(), 45);
});

test('market refresh runs every fifteen minutes only while visible', () => {
  const now = new Date('2026-08-01T13:30:00Z');
  assert.equal(REFRESH_INTERVALS.marketWhenVisibleMs, 15 * 60 * 1000);
  assert.equal(shouldAutoRefreshMarket({ lastRefreshAt: '2026-08-01T13:14:59Z', now, visible: true }), true);
  assert.equal(shouldAutoRefreshMarket({ lastRefreshAt: '2026-08-01T13:20:00Z', now, visible: true }), false);
  assert.equal(shouldAutoRefreshMarket({ lastRefreshAt: '2026-08-01T13:00:00Z', now, visible: false }), false);
});
