import { buy, createSimulation } from './portfolio-simulator.js';

export const simulationPresets = Object.freeze([
  Object.freeze({
    id: 'beginner',
    label: 'Débutant prudent',
    description: '10 000 € fictifs, allocation simple et liquidités disponibles.',
    initialCash: 10000,
    orders: Object.freeze([
      Object.freeze({ ticker: 'WPEA', name: 'ETF Monde fictif', amount: 5000, price: 5.5 }),
      Object.freeze({ ticker: 'PAEJ', name: 'ETF Asie fictif', amount: 1500, price: 24 })
    ])
  }),
  Object.freeze({
    id: 'growth',
    label: 'Croissance dynamique',
    description: '20 000 € fictifs avec exposition monde, technologie et semi-conducteurs.',
    initialCash: 20000,
    orders: Object.freeze([
      Object.freeze({ ticker: 'WPEA', name: 'ETF Monde fictif', amount: 10000, price: 5.5 }),
      Object.freeze({ ticker: 'NVDA', name: 'NVIDIA fictive', amount: 3500, price: 150 }),
      Object.freeze({ ticker: 'SMH', name: 'ETF semi-conducteurs fictif', amount: 2500, price: 260 })
    ])
  }),
  Object.freeze({
    id: 'dca',
    label: 'Projet long terme',
    description: 'Scénario de démonstration centré sur un ETF Monde et un DCA mensuel.',
    initialCash: 5000,
    orders: Object.freeze([
      Object.freeze({ ticker: 'WPEA', name: 'ETF Monde fictif', amount: 3000, price: 5.5 })
    ]),
    dca: Object.freeze({ initialAmount: 3000, monthlyAmount: 150, months: 240, annualReturn: 0.07 })
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
