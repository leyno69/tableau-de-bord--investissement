export class GenerateAutomatedInsights {
  execute({ dashboard }) {
    if (!dashboard || typeof dashboard !== 'object' || Array.isArray(dashboard)) throw new TypeError('dashboard doit être un objet.');
    const insights = [];
    const valuation = dashboard.valuation ?? {};
    const allocation = dashboard.allocation ?? {};
    const analytics = dashboard.analytics ?? dashboard.performance ?? {};
    const marketData = dashboard.marketData ?? valuation.marketData ?? {};

    const positions = Array.isArray(valuation.positions) ? valuation.positions : [];
    const total = amount(valuation.totalValue);
    for (const position of positions) {
      const value = amount(position.convertedValue ?? position.value);
      const weight = total > 0 ? value / total : 0;
      if (weight >= 0.4) insights.push(signal('CONCENTRATION_CRITICAL', 'CRITICAL', `La position ${position.assetId ?? 'inconnue'} représente ${(weight * 100).toFixed(1)} % du portefeuille.`, weight));
      else if (weight >= 0.25) insights.push(signal('CONCENTRATION_WARNING', 'WARNING', `La position ${position.assetId ?? 'inconnue'} représente ${(weight * 100).toFixed(1)} % du portefeuille.`, weight));
    }

    const cash = amount(valuation.cashValue);
    const cashWeight = total > 0 ? cash / total : 0;
    if (cashWeight >= 0.25) insights.push(signal('HIGH_CASH', 'INFO', `Les liquidités représentent ${(cashWeight * 100).toFixed(1)} % du portefeuille.`, cashWeight));

    const drawdown = ratio(analytics.maxDrawdown ?? analytics.drawdown);
    if (drawdown <= -0.2 || drawdown >= 0.2) insights.push(signal('DRAWDOWN_CRITICAL', 'CRITICAL', `Le drawdown atteint ${(Math.abs(drawdown) * 100).toFixed(1)} %.`, Math.abs(drawdown)));
    else if (drawdown <= -0.1 || drawdown >= 0.1) insights.push(signal('DRAWDOWN_WARNING', 'WARNING', `Le drawdown atteint ${(Math.abs(drawdown) * 100).toFixed(1)} %.`, Math.abs(drawdown)));

    const staleCount = Number(marketData.staleCount ?? positions.filter(item => item.marketData?.status === 'stale').length);
    const unavailableCount = Number(marketData.unavailableCount ?? valuation.issues?.length ?? 0);
    if (staleCount > 0) insights.push(signal('STALE_MARKET_DATA', 'WARNING', `${staleCount} donnée(s) de marché sont périmées.`, staleCount));
    if (unavailableCount > 0) insights.push(signal('INCOMPLETE_MARKET_DATA', 'WARNING', `${unavailableCount} donnée(s) de marché sont indisponibles.`, unavailableCount));

    const categories = Array.isArray(allocation.categories) ? allocation.categories : Array.isArray(allocation) ? allocation : [];
    if (categories.length === 1 && positions.length > 1) insights.push(signal('LOW_DIVERSIFICATION', 'WARNING', 'Les positions sont concentrées dans une seule catégorie d’allocation.', 1));

    const confidence = Math.max(0, Math.min(1, 1 - unavailableCount * 0.2 - staleCount * 0.05));
    return Object.freeze({
      generatedAt: new Date().toISOString(),
      confidence,
      dataQuality: unavailableCount > 0 ? 'partial' : staleCount > 0 ? 'stale' : 'fresh',
      insights: Object.freeze(insights.sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || a.code.localeCompare(b.code)))
    });
  }
}

function signal(code, severity, message, metric) { return Object.freeze({ code, severity, message, metric }); }
function amount(value) {
  if (value && typeof value === 'object' && Number.isFinite(Number(value.amount))) return Number(value.amount);
  const number = Number(value ?? 0); return Number.isFinite(number) ? number : 0;
}
function ratio(value) { const number = Number(value ?? 0); return Number.isFinite(number) ? number : 0; }
function severityRank(value) { return value === 'CRITICAL' ? 3 : value === 'WARNING' ? 2 : 1; }
