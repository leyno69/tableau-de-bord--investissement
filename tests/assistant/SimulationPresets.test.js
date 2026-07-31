import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulationFromPreset, findSimulationPreset, simulationPresets } from '../../simulation-presets.js';
import { summarizeSimulation } from '../../portfolio-simulator.js';

test('beta presets are available and uniquely identified', () => {
  assert.ok(simulationPresets.length >= 3);
  assert.equal(new Set(simulationPresets.map(preset => preset.id)).size, simulationPresets.length);
  assert.equal(findSimulationPreset('beginner')?.label, 'Débutant prudent');
});

test('each preset explains risk, horizon, allocation and assumptions', () => {
  for (const preset of simulationPresets) {
    assert.match(preset.riskLevel, /^(PRUDENT|BALANCED|DYNAMIC)$/);
    assert.ok(preset.riskLabel.length > 0);
    assert.ok(preset.horizonYears > 0);
    assert.ok(preset.assumptions.annualReturn > -1);
    assert.ok(preset.assumptions.annualVolatility >= 0);
    assert.ok(preset.assumptions.disclaimer.length > 0);
    const allocationTotal = preset.allocation.reduce((total, item) => total + item.weight, 0);
    assert.ok(Math.abs(allocationTotal - 1) < 1e-9);
    assert.ok(Object.isFrozen(preset));
    assert.ok(Object.isFrozen(preset.allocation));
    assert.ok(Object.isFrozen(preset.assumptions));
  }
});

test('a preset creates an isolated populated simulation', () => {
  const { simulation, preset } = createSimulationFromPreset('growth');
  const summary = summarizeSimulation(simulation);
  assert.equal(simulation.isSimulation, true);
  assert.equal(simulation.positions.length, preset.orders.length);
  assert.equal(summary.transactionCount, preset.orders.length);
  assert.ok(summary.cash >= 0);
});

test('unknown preset is rejected', () => {
  assert.throws(() => createSimulationFromPreset('missing'), /inconnu/);
});
