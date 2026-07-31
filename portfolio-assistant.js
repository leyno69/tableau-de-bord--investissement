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

function insight({ text, confidence, actions = [], severity = 'info' }) {
  return Object.freeze({ text, confidence, actions: Object.freeze(actions), severity });
}

export function buildPortfolioInsight(question, portfolio) {
  const normalized = String(question || '').toLowerCase();
  const current = safePortfolio(portfolio);
  const summary = summarizePortfolio(current);
  const allocations = allocationByRegion(current);
  const largest = allocations[0] ?? null;
  const positionCount = current.positions.length;

  if (!positionCount) {
    return insight({
      text: 'Votre portefeuille ne contient encore aucune position exploitable. Ajoutez au moins un actif pour obtenir une analyse personnalisée.',
      confidence: 1,
      actions: ['Ajouter une première position'],
      severity: 'warning'
    });
  }

  if (normalized.includes('concentration') || normalized.includes('répartition') || normalized.includes('repartition')) {
    const concentration = largest ? `${largest.label} représente ${percent(largest.percent)} de la valeur investie` : 'aucune zone dominante n’est identifiable';
    const elevated = Boolean(largest && largest.percent >= 70);
    return insight({
      text: `Votre portefeuille comporte ${positionCount} position${positionCount > 1 ? 's' : ''}. ${concentration}.${elevated ? ' Cette concentration est élevée et mérite d’être surveillée avant tout nouveau renforcement.' : ' La répartition ne montre pas de concentration extrême à ce stade.'}`,
      confidence: 0.96,
      actions: elevated ? ['Comparer une zone sous-pondérée', 'Éviter de renforcer la zone dominante'] : ['Conserver la diversification actuelle'],
      severity: elevated ? 'warning' : 'positive'
    });
  }

  if (normalized.includes('liquidit') || normalized.includes('renforcer') || normalized.includes('acheter')) {
    if (current.cash <= 0) {
      return insight({
        text: `Aucune liquidité n’est actuellement enregistrée. La valeur suivie est de ${money.format(summary.totalValue)} ; ajoutez votre solde disponible avant de simuler un renforcement.`,
        confidence: 0.99,
        actions: ['Renseigner les liquidités disponibles'],
        severity: 'warning'
      });
    }
    return insight({
      text: `Vous avez ${money.format(current.cash)} de liquidités enregistrées. Un renforcement progressif est préférable à un investissement en une seule fois, en priorité sur les zones sous-pondérées par rapport à ${largest?.label ?? 'votre allocation principale'}.`,
      confidence: 0.9,
      actions: ['Simuler un investissement progressif', 'Examiner les zones sous-pondérées'],
      severity: 'info'
    });
  }

  if (normalized.includes('performance') || normalized.includes('plus-value') || normalized.includes('moins-value') || normalized.includes('bilan')) {
    const direction = summary.pnl >= 0 ? 'positive' : 'négative';
    return insight({
      text: `La performance latente est ${direction} de ${money.format(Math.abs(summary.pnl))}, soit ${percent(Math.abs(summary.pnlPct))}. La valeur totale suivie atteint ${money.format(summary.totalValue)}.`,
      confidence: 0.99,
      actions: ['Vérifier les cours actualisés', 'Comparer avec votre horizon d’investissement'],
      severity: summary.pnl >= 0 ? 'positive' : 'warning'
    });
  }

  if (normalized.includes('alerte') || normalized.includes('risque')) {
    const alerts = [];
    if (largest?.percent >= 70) alerts.push(`concentration de ${percent(largest.percent)} sur ${largest.label}`);
    if (current.cash <= 0) alerts.push('aucune liquidité disponible enregistrée');
    if (summary.pnlPct <= -10) alerts.push(`moins-value latente de ${percent(Math.abs(summary.pnlPct))}`);
    if (!alerts.length) {
      return insight({ text: 'Aucune alerte structurelle majeure n’est détectée dans les données actuelles. Continuez toutefois à vérifier la diversification et l’exactitude des cours.', confidence: 0.88, actions: ['Actualiser les cours'], severity: 'positive' });
    }
    return insight({ text: `Priorités détectées : ${alerts.join(' ; ')}.`, confidence: 0.94, actions: ['Examiner la concentration', 'Vérifier les données manquantes'], severity: 'warning' });
  }

  return insight({
    text: `Votre portefeuille vaut actuellement ${money.format(summary.totalValue)} pour ${positionCount} position${positionCount > 1 ? 's' : ''}. Demandez-moi une analyse de concentration, de performance, de liquidités ou de risques.`,
    confidence: 0.82,
    actions: ['Analyser la concentration', 'Afficher les risques prioritaires'],
    severity: 'info'
  });
}

export function buildPortfolioReply(question, portfolio) {
  return buildPortfolioInsight(question, portfolio).text;
}

export function loadPortfolioFromStorage(storage, key = 'invest-dashboard-portfolio') {
  try {
    const raw = storage?.getItem?.(key);
    return raw ? safePortfolio(JSON.parse(raw)) : safePortfolio(null);
  } catch {
    return safePortfolio(null);
  }
}
