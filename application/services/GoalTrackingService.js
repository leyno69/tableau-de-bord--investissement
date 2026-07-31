export class GoalTrackingService {
  evaluate({ currentAmount, targetAmount, targetDate, asOfDate, monthlyContribution = 0, annualReturnRate = 0, currency = 'EUR' }) {
    const current = GoalTrackingService.#nonNegative(currentAmount, 'currentAmount');
    const target = GoalTrackingService.#positive(targetAmount, 'targetAmount');
    const contribution = GoalTrackingService.#nonNegative(monthlyContribution, 'monthlyContribution');
    const rate = GoalTrackingService.#rate(annualReturnRate);
    const asOf = GoalTrackingService.#date(asOfDate, 'asOfDate');
    const targetDay = GoalTrackingService.#date(targetDate, 'targetDate');
    const monthsRemaining = Math.max(0, GoalTrackingService.#monthsBetween(asOf, targetDay));
    const monthlyRate = Math.pow(1 + rate, 1 / 12) - 1;
    let projected = current;
    for (let month = 0; month < monthsRemaining; month += 1) projected = projected * (1 + monthlyRate) + contribution;
    const gap = target - current;
    const projectedGap = target - projected;
    const requiredMonthlyContribution = GoalTrackingService.#requiredContribution(current, target, monthlyRate, monthsRemaining);
    return Object.freeze({
      currency: GoalTrackingService.#currency(currency),
      asOfDate: asOf,
      targetDate: targetDay,
      currentAmount: GoalTrackingService.#round(current),
      targetAmount: GoalTrackingService.#round(target),
      progressRate: GoalTrackingService.#roundRate(Math.min(current / target, 1)),
      gap: GoalTrackingService.#round(Math.max(gap, 0)),
      monthsRemaining,
      projectedAmount: GoalTrackingService.#round(projected),
      projectedGap: GoalTrackingService.#round(Math.max(projectedGap, 0)),
      onTrack: projected >= target,
      requiredMonthlyContribution: GoalTrackingService.#round(requiredMonthlyContribution)
    });
  }

  static #requiredContribution(current, target, monthlyRate, months) {
    if (months === 0) return current >= target ? 0 : target - current;
    const futureCurrent = current * Math.pow(1 + monthlyRate, months);
    if (futureCurrent >= target) return 0;
    if (monthlyRate === 0) return (target - current) / months;
    return (target - futureCurrent) * monthlyRate / (Math.pow(1 + monthlyRate, months) - 1);
  }
  static #monthsBetween(from, to) { const start = new Date(`${from}T00:00:00.000Z`); const end = new Date(`${to}T00:00:00.000Z`); if (end < start) return 0; return (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth(); }
  static #date(value, field) { if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) !== value) throw new TypeError(`${field} doit être une date YYYY-MM-DD valide.`); return value; }
  static #nonNegative(value, field) { const number = Number(value); if (!Number.isFinite(number) || number < 0) throw new RangeError(`${field} doit être positif ou nul.`); return number; }
  static #positive(value, field) { const number = Number(value); if (!Number.isFinite(number) || number <= 0) throw new RangeError(`${field} doit être strictement positif.`); return number; }
  static #rate(value) { const number = Number(value); if (!Number.isFinite(number) || number <= -1 || number > 10) throw new RangeError('annualReturnRate est invalide.'); return number; }
  static #currency(value) { if (typeof value !== 'string' || !/^[A-Za-z]{3}$/.test(value.trim())) throw new TypeError('currency doit être une devise ISO.'); return value.trim().toUpperCase(); }
  static #round(value) { return Number(Number(value).toFixed(2)); }
  static #roundRate(value) { return Number(Number(value).toFixed(10)); }
}
