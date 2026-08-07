import { runMassSimulation } from '../../leynor-premium-lab.js';

export const PILOT_DEFINITION = Object.freeze({
  portfolioCount: 10000,
  years: 1,
  initialAmount: 10000,
  monthlyContribution: 0,
  annualInflation: 0,
  annualFees: 0,
  goal: null,
  seed: 20260807,
  allocation: Object.freeze([
    Object.freeze({
      id: 'beginner-aggregate',
      label: 'Preset beginner — hypothèse agrégée',
      weight: 1,
      annualReturn: 0.045,
      annualVolatility: 0.10
    })
  ])
});

export function runBeginnerHistoricalPilot() {
  return runMassSimulation(PILOT_DEFINITION);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(`${JSON.stringify(runBeginnerHistoricalPilot(), null, 2)}\n`);
}
