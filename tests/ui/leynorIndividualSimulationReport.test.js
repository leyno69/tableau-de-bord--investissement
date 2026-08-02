import test from 'node:test';
import assert from 'node:assert/strict';
import { createIndividualSimulationReport, buildIndividualSimulationPdf } from '../../leynor-individual-simulation-report.js';
import { runResilienceSimulation } from '../../leynor-resilience-lab.js';

function simulation() {
  return runResilienceSimulation({
    portfolioCount: 50,
    years: 5,
    initialAmount: 10000,
    monthlyContribution: 200,
    annualInflation: 0.02,
    annualFees: 0.003,
    goal: 30000,
    seed: 42,
    allocation: [
      { id: 'world', label: 'ETF World', weight: 0.8, annualReturn: 0.07, annualVolatility: 0.16 },
      { id: 'cash', label: 'Liquidités', weight: 0.2, annualReturn: 0.02, annualVolatility: 0.01 }
    ],
    events: [
      { type: 'withdrawal', month: 12, amount: 1500 },
      { type: 'contribution_pause', month: 18 },
      { type: 'contribution_resume', month: 24 }
    ]
  });
}

test('crée un rapport individuel exhaustif et immuable', () => {
  const report = createIndividualSimulationReport({
    simulationId: 'resilience-001',
    label: 'Résilience de référence',
    engineVersion: '6.1.0',
    generatedAt: '2026-08-02T12:00:00+02:00',
    report: simulation()
  });

  assert.equal(Object.isFrozen(report), true);
  assert.match(report.title, /Résilience de référence/);
  assert.ok(report.sections.some(section => section.title === 'Identification et reproductibilité'));
  assert.ok(report.sections.flatMap(section => section.lines).some(line => line.includes('LEYNOR-')));
  assert.ok(report.sections.flatMap(section => section.lines).some(line => line.includes('retrait planifié')));
  assert.ok(report.sections.flatMap(section => section.lines).some(line => line.includes('non disponible')));
});

test('génère un PDF réel et déterministe', () => {
  const input = {
    simulationId: 'resilience-001',
    engineVersion: '6.1.0',
    generatedAt: '2026-08-02T12:00:00+02:00',
    report: simulation()
  };
  const first = buildIndividualSimulationPdf(input);
  const second = buildIndividualSimulationPdf(input);
  assert.equal(new TextDecoder().decode(first.slice(0, 8)), '%PDF-1.4');
  assert.deepEqual(first, second);
});

test('refuse un résultat incomplet', () => {
  assert.throws(() => createIndividualSimulationReport({
    simulationId: 'invalid',
    engineVersion: '6.1.0',
    generatedAt: '2026-08-02',
    report: {}
  }), /résultat de simulation complet/);
});
