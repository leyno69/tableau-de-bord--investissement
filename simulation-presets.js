import { buy, createSimulation } from './portfolio-simulator.js';

function freezePreset(preset) {
  return Object.freeze({
    ...preset,
    allocation: Object.freeze(preset.allocation.map(item => Object.freeze({ ...item }))),
    assumptions: Object.freeze({ ...preset.assumptions }),
    orders: Object.freeze(preset.orders.map(order => Object.freeze({ ...order }))),
    ...(preset.dca ? { dca: Object.freeze({ ...preset.dca }) } : {})
  });
}

export const simulationPresets = Object.freeze([
  freezePreset({
    id: 'beginner',
    label: 'Débutant prudent',
    description: '10 000 € fictifs, allocation simple et liquidités disponibles.',
    initialCash: 10000,
    riskLevel: 'PRUDENT',
    riskLabel: 'Risque modéré',
    horizonYears: 5,
    allocation: [
      { label: 'ETF Monde', weight: 0.5 },
      { label: 'ETF Asie', weight: 0.15 },
      { label: 'Liquidités', weight: 0.35 }
    ],
    assumptions: { annualReturn: 0.045, annualVolatility: 0.1, disclaimer: 'Hypothèses pédagogiques non garanties.' },
    orders: [
      { ticker: 'WPEA', name: 'ETF Monde fictif', amount: 5000, price: 5.5 },
      { ticker: 'PAEJ', name: 'ETF Asie fictif', amount: 1500, price: 24 }
    ]
  }),
  freezePreset({
    id: 'growth',
    label: 'Croissance dynamique',
    description: '20 000 € fictifs avec exposition monde, technologie et semi-conducteurs.',
    initialCash: 20000,
    riskLevel: 'DYNAMIC',
    riskLabel: 'Risque élevé',
    horizonYears: 8,
    allocation: [
      { label: 'ETF Monde', weight: 0.5 },
      { label: 'Technologie', weight: 0.175 },
      { label: 'Semi-conducteurs', weight: 0.125 },
      { label: 'Liquidités', weight: 0.2 }
    ],
    assumptions: { annualReturn: 0.07, annualVolatility: 0.2, disclaimer: 'La volatilité et les pertes temporaires peuvent être importantes.' },
    orders: [
      { ticker: 'WPEA', name: 'ETF Monde fictif', amount: 10000, price: 5.5 },
      { ticker: 'NVDA', name: 'NVIDIA fictive', amount: 3500, price: 150 },
      { ticker: 'SMH', name: 'ETF semi-conducteurs fictif', amount: 2500, price: 260 }
    ]
  }),
  freezePreset({
    id: 'dca',
    label: 'Projet long terme',
    description: 'Scénario de démonstration centré sur un ETF Monde et un DCA mensuel.',
    initialCash: 5000,
    riskLevel: 'BALANCED',
    riskLabel: 'Risque équilibré',
    horizonYears: 20,
    allocation: [
      { label: 'ETF Monde', weight: 0.6 },
      { label: 'Liquidités initiales', weight: 0.4 }
    ],
    assumptions: { annualReturn: 0.07, annualVolatility: 0.15, disclaimer: 'Projection longue durée sensible au rendement retenu.' },
    orders: [
      { ticker: 'WPEA', name: 'ETF Monde fictif', amount: 3000, price: 5.5 }
    ],
    dca: { initialAmount: 3000, monthlyAmount: 150, months: 240, annualReturn: 0.07 }
  })
]);

export function findSimulationPreset(id) {
  return simulationPresets.find(preset => preset.id === id) ?? null;
}

export function createSimulationFromPreset(id) {
  const preset = findSimulationPreset(id);
  if (!preset) throw new TypeError('Préréglage de simulation inconnu.');
  const simulation = createSimulation({ initialCash: preset.initialCash });
  preset.orders.forEach(order => buy(simulation, order));
  return { simulation, preset };
}
