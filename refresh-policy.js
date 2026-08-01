export const REFRESH_INTERVALS = Object.freeze({
  marketWhenVisibleMs: 15 * 60 * 1000,
  radarProbabilityMs: 60 * 60 * 1000,
  longTermTrendMs: 24 * 60 * 60 * 1000
});

export const DAILY_RADAR_SLOTS = Object.freeze([
  Object.freeze({ hour: 8, minute: 0, label: 'Ouverture Europe' }),
  Object.freeze({ hour: 12, minute: 30, label: 'Point de mi-journée' }),
  Object.freeze({ hour: 17, minute: 45, label: 'Clôture Europe' }),
  Object.freeze({ hour: 22, minute: 15, label: 'Clôture États-Unis' })
]);

export function nextDailyRadarRefresh(from = new Date()) {
  const source = new Date(from);
  for (const slot of DAILY_RADAR_SLOTS) {
    const candidate = new Date(source);
    candidate.setHours(slot.hour, slot.minute, 0, 0);
    if (candidate > source) return Object.freeze({ at: candidate, label: slot.label });
  }
  const tomorrow = new Date(source);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(DAILY_RADAR_SLOTS[0].hour, DAILY_RADAR_SLOTS[0].minute, 0, 0);
  return Object.freeze({ at: tomorrow, label: DAILY_RADAR_SLOTS[0].label });
}

export function shouldAutoRefreshMarket({ lastRefreshAt, now = new Date(), visible = true } = {}) {
  if (!visible) return false;
  const last = lastRefreshAt ? new Date(lastRefreshAt).getTime() : 0;
  return !Number.isFinite(last) || now.getTime() - last >= REFRESH_INTERVALS.marketWhenVisibleMs;
}

export function formatRefreshTime(value) {
  if (!value) return 'Jamais actualisé';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Heure inconnue';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export function createRefreshStatus({ lastRefreshAt, now = new Date() } = {}) {
  const nextRadar = nextDailyRadarRefresh(now);
  return Object.freeze({
    lastMarketLabel: formatRefreshTime(lastRefreshAt),
    nextRadarAt: nextRadar.at.toISOString(),
    nextRadarLabel: `${nextRadar.label} à ${new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(nextRadar.at)}`,
    marketIntervalMinutes: REFRESH_INTERVALS.marketWhenVisibleMs / 60000,
    probabilityIntervalMinutes: REFRESH_INTERVALS.radarProbabilityMs / 60000
  });
}
