import { ScenarioDefinition } from '../../domain/simulation/ScenarioDefinition.js';

function monthlyRate(annualRate) {
  return Math.pow(1 + annualRate, 1 / 12) - 1;
}

function round(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export class ScenarioSimulationEngine {
  simulate(definition) {
    const scenario = definition instanceof ScenarioDefinition
      ? definition
      : new ScenarioDefinition(definition);

    const grossMonthlyReturn = monthlyRate(scenario.annualReturn);
    const monthlyDividendYield = monthlyRate(scenario.annualDividendYield);
    const monthlyManagementFee = scenario.annualManagementFee / 12;

    let value = 0;
    let contributed = 0;
    let feesPaid = 0;
    let dividendsPaid = 0;
    const timeline = [];

    const invest = amount => {
      if (amount <= 0) return;
      const fee = Math.min(amount, scenario.transactionFee);
      feesPaid += fee;
      contributed += amount;
      value += amount - fee;
    };

    invest(scenario.initialAmount);

    for (let month = 1; month <= scenario.months; month += 1) {
      if (scenario.strategy === 'DCA') invest(scenario.monthlyAmount);

      const marketGain = value * grossMonthlyReturn;
      const dividend = value * monthlyDividendYield;
      const managementFee = value * monthlyManagementFee;

      value += marketGain - managementFee;
      feesPaid += managementFee;
      dividendsPaid += dividend;

      if (scenario.reinvestDividends) value += dividend;

      timeline.push(Object.freeze({
        month,
        value: round(value),
        contributed: round(contributed),
        feesPaid: round(feesPaid),
        dividendsPaid: round(dividendsPaid)
      }));
    }

    const finalValue = round(value);
    const netGain = round(finalValue + (scenario.reinvestDividends ? 0 : dividendsPaid) - contributed);

    return Object.freeze({
      scenario: Object.freeze(scenario.toJSON()),
      finalValue,
      contributed: round(contributed),
      netGain,
      feesPaid: round(feesPaid),
      dividendsPaid: round(dividendsPaid),
      timeline: Object.freeze(timeline)
    });
  }

  compare(definitions) {
    if (!Array.isArray(definitions) || definitions.length < 2) {
      throw new TypeError('definitions doit contenir au moins deux scénarios.');
    }

    const results = definitions.map(definition => this.simulate(definition));
    const ranked = [...results].sort((left, right) => right.finalValue - left.finalValue);
    const leader = ranked[0];

    return Object.freeze({
      results: Object.freeze(results),
      leaderScenarioId: leader.scenario.id,
      spread: round(ranked[0].finalValue - ranked[ranked.length - 1].finalValue)
    });
  }
}
