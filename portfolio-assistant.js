import { allocationByRegion, summarizePortfolio } from './portfolio.js';

const money = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

function percent(value) {
  return `${Number(value || 0).toFixed(1).replace('.', ',')} %`;
}

function safePortfolio(portfolio) {
  return {
    cash: Number(portfolio?.cash || 0),
    positions: Array.isArray(portfolio?.positions) ? portfolio.positions : []
  };
}

export function buildPortfolioReply(question, portfolio) {
  const normalized = String(question || '').toLowerCase();
  const current = safePortfolio(portfolio);
  const summary = summarizePortfolio(current);
  const allocations = allocationByRegion(current);
  const largest = allocations[0] ?? null;
  const positionCount = current.positions.length;

  if (!positionCount) {
    return 'Votre portefeuille ne contient encore aucune position exploitable. Ajoutez au moins un actif pour obtenir une analyse personnalisée.';
  }

  if (normalized.includes('concentration') || normalized.includes('répartition') || normalized.includes('repartition')) {
    const concentration = largest ? `${largest.label} représente ${percent(largest.percent)} de la valeur investie` : 'aucune zone dominante n’est identifiable';
    const warning = largest && largest.percent >= 70 ? ' Cette concentration est élevée et mérite d’être surveillée avant tout nouveau renforcement.' : ' La répartition ne montre pas de concentration extrême à ce stade.';
    return `Votre portefeuille comporte ${positionCount} position${positionCount > 1 ? 's' : ''}. ${concentration}.${warning}`;
  }

  if (normalized.includes('liquidit') || normalized.includes('renforcer') || normalized.includes('acheter')) {
    if (current.cash <= 0) return `Aucune liquidité n’est actuellement enregistrée. La valeur suivie est de ${money.format(summary.totalValue)} ; ajoutez votre solde disponible avant de simuler un renforcement.`;
    return `Vous avez ${money.format(current.cash)} de liquidités enregistrées. Un renforcement progressif est préférable à un investissement en une seule fois, en priorité sur les zones sous-pondérées par rapport à ${largest?.label ?? 'votre allocation principale'}.`;
  }

  if (normalized.includes('performance') || normalized.includes('plus-value') || normalized.includes('moins-value') || normalized.includes('bilan')) {
    const direction = summary.pnl >= 0 ? 'positive' : 'négative';
    return `La performance latente est ${direction} de ${money.format(Math.abs(summary.pnl))}, soit ${percent(Math.abs(summary.pnlPct))}. La valeur totale suivie atteint ${money.format(summary.totalValue)}.`;
  }

  if (normalized.includes('alerte') || normalized.includes('risque')) {
    const alerts = [];
    if (largest?.percent >= 70) alerts.push(`concentration de ${percent(largest.percent)} sur ${largest.label}`);
    if (current.cash <= 0) alerts.push('aucune liquidité disponible enregistrée');
    if (summary.pnlPct <= -10) alerts.push(`moins-value latente de ${percent(Math.abs(summary.pnlPct))}`);
    if (!alerts.length) return 'Aucune alerte structurelle majeure n’est détectée dans les données actuelles. Continuez toutefois à vérifier la diversification et l’exactitude des cours.';
    return `Priorités détectées : ${alerts.join(' ; ')}.`;
  }

  return `Votre portefeuille vaut actuellement ${money.format(summary.totalValue)} pour ${positionCount} position${positionCount > 1 ? 's' : ''}. Demandez-moi une analyse de concentration, de performance, de liquidités ou de risques.`;
}

export function loadPortfolioFromStorage(storage, key = 'invest-dashboard-portfolio') {
  try {
    const raw = storage?.getItem?.(key);
    return raw ? safePortfolio(JSON.parse(raw)) : safePortfolio(null);
  } catch {
    return safePortfolio(null);
  }
}
