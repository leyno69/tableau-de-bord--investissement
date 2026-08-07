import { createPremiumReport } from './premium-pdf-export.js';

function finiteNumber(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${field} doit être un nombre fini.`);
  return number;
}

function nonEmptyText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`);
  return value.trim();
}

function formatCurrency(value, currency) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
}

function normalizePosition(position, index) {
  const quantity = finiteNumber(position?.quantity, `positions[${index}].quantity`);
  const marketValue = finiteNumber(position?.marketValue, `positions[${index}].marketValue`);
  if (quantity < 0 || marketValue < 0) throw new RangeError(`positions[${index}] contient une valeur négative.`);
  return Object.freeze({
    name: nonEmptyText(position?.name, `positions[${index}].name`),
    symbol: nonEmptyText(position?.symbol, `positions[${index}].symbol`),
    quantity,
    marketValue,
    assetType: nonEmptyText(position?.assetType ?? 'Non renseigné', `positions[${index}].assetType`)
  });
}

export function createPortfolioPremiumReport({
  generatedAt,
  currency = 'EUR',
  cash = 0,
  positions,
  methodology = 'Valorisation des positions à partir des données disponibles au moment de la génération.',
  limitations = []
}) {
  const normalizedCurrency = nonEmptyText(currency, 'currency').toUpperCase();
  const normalizedCash = finiteNumber(cash, 'cash');
  if (normalizedCash < 0) throw new RangeError('cash ne peut pas être négatif.');
  if (!Array.isArray(positions) || positions.length === 0) throw new TypeError('positions doit contenir au moins une ligne.');

  const normalizedPositions = positions.map(normalizePosition);
  const investedValue = normalizedPositions.reduce((sum, position) => sum + position.marketValue, 0);
  const totalValue = investedValue + normalizedCash;
  if (totalValue <= 0) throw new RangeError('La valeur totale du portefeuille doit être positive.');

  const sortedPositions = [...normalizedPositions].sort((left, right) => right.marketValue - left.marketValue);
  const largestWeight = sortedPositions[0].marketValue / totalValue;
  const positionLines = sortedPositions.map(position => {
    const weight = position.marketValue / totalValue;
    return `${position.name} (${position.symbol}) — ${position.quantity} unité(s), ${formatCurrency(position.marketValue, normalizedCurrency)}, ${(weight * 100).toFixed(1)} % du portefeuille, type ${position.assetType}`;
  });

  return createPremiumReport({
    title: 'Rapport portefeuille LEYNOR AI',
    generatedAt: nonEmptyText(generatedAt, 'generatedAt'),
    methodology: nonEmptyText(methodology, 'methodology'),
    sections: [
      {
        title: 'Synthèse',
        lines: [
          `Valeur totale : ${formatCurrency(totalValue, normalizedCurrency)}`,
          `Valeur investie : ${formatCurrency(investedValue, normalizedCurrency)}`,
          `Liquidités : ${formatCurrency(normalizedCash, normalizedCurrency)}`,
          `Nombre de lignes : ${normalizedPositions.length}`,
          `Poids de la première ligne : ${(largestWeight * 100).toFixed(1)} %`
        ]
      },
      { title: 'Positions', lines: positionLines },
      {
        title: 'Lecture du risque',
        lines: [
          largestWeight >= 0.5
            ? 'Concentration élevée : une seule ligne représente au moins 50 % du portefeuille.'
            : 'Aucune ligne ne représente à elle seule 50 % ou plus du portefeuille.',
          'Cette lecture décrit la structure observée et ne constitue pas une recommandation d’investissement.'
        ]
      }
    ],
    assumptions: ['Les valeurs de marché fournies sont exactes et exprimées dans une devise unique.'],
    limitations: [
      'Aucune performance future n’est estimée dans ce rapport.',
      'La qualité du rapport dépend de la qualité et de la fraîcheur des données importées.',
      ...limitations.map((value, index) => nonEmptyText(value, `limitations[${index}]`))
    ]
  });
}
