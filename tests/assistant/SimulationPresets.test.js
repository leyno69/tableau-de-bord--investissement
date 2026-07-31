import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulationFromPreset, findSimulationPreset, simulationPresets } from '../../simulation-presets.js';
import { summarizeSimulation } from '../../portfolio-simulator.js';

test('beta presets are available and uniquely identified', () => {
  assert.ok(simulationPresets.length >= 3);
  assert.equal(new Set(simulationPresets.map(preset => preset.id)).size, simulationPresets.length);
  assert.equal(findSimulationPreset('beginner')?.label, 'Débutant prudent');
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
