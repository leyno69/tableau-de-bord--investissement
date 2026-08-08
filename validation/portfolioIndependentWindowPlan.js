export const BEGINNER_PROXY_VALIDATION_WINDOWS_V1 = Object.freeze([
  Object.freeze({ id: '2015', startDate: '2015-01-02', endDate: '2015-12-31', regimeTag: 'mixed-flat' }),
  Object.freeze({ id: '2018', startDate: '2018-01-02', endDate: '2018-12-31', regimeTag: 'late-cycle-drawdown' }),
  Object.freeze({ id: '2020', startDate: '2020-01-02', endDate: '2020-12-31', regimeTag: 'pandemic-shock-recovery' }),
  Object.freeze({ id: '2022', startDate: '2022-01-03', endDate: '2022-12-30', regimeTag: 'inflation-rates-drawdown' }),
  Object.freeze({ id: '2023', startDate: '2023-01-02', endDate: '2023-12-29', regimeTag: 'post-drawdown-recovery' })
]);

function timestamp(date, field) {
  const parsed = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed)) throw new TypeError(`${field} doit être une date ISO valide.`);
  return parsed;
}

// Le seul test qui garantissait l'absence de chevauchement portait sur la
// constante par défaut ci-dessus, jamais sur un plan réellement transmis à
// runLicensedBeginnerProxyValidation — un appelant pouvait donc fournir des
// fenêtres qui se chevauchent en pratique, étiquetées "non chevauchantes"
// sans qu'aucun contrôle à l'exécution ne le refuse.
export function assertNonOverlappingWindows(windows) {
  if (!Array.isArray(windows) || windows.length === 0) {
    throw new TypeError('windows doit être un tableau non vide.');
  }
  const sorted = windows
    .map((window, index) => {
      const start = timestamp(window.startDate, `windows[${index}].startDate`);
      const end = timestamp(window.endDate, `windows[${index}].endDate`);
      if (end < start) throw new RangeError(`fenêtre ${window.id ?? index} : endDate antérieure à startDate.`);
      return { id: window.id ?? String(index), start, end };
    })
    .sort((a, b) => a.start - b.start);
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index].start <= sorted[index - 1].end) {
      throw new RangeError(
        `fenêtres non indépendantes : ${sorted[index - 1].id} et ${sorted[index].id} se chevauchent.`
      );
    }
  }
  return true;
}

export const BEGINNER_PROXY_VALIDATION_PLAN_V1 = Object.freeze({
  schemaVersion: 1,
  planId: 'beginner-proxy-regime-windows-v1',
  presetId: 'beginner',
  track: 'proxy',
  windows: BEGINNER_PROXY_VALIDATION_WINDOWS_V1,
  allocation: Object.freeze([
    Object.freeze({ ticker: 'WPEA_PROXY', weight: 0.50 }),
    Object.freeze({ ticker: 'PAEJ', weight: 0.15 }),
    Object.freeze({ ticker: 'CASH', weight: 0.35 })
  ]),
  costPolicy: Object.freeze({ transactionCostBps: 0, exemptTickers: Object.freeze(['CASH']) }),
  rebalancePolicy: 'none',
  contributionPolicy: 'none',
  interpretation: 'regime-stratified-non-overlapping-not-iid',
  lockedBeforeLicensedDataRead: true
});
