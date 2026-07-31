import { buildExhaustiveLeynorReport, runAdvancedLabSimulationBatched } from './leynor-premium-lab-advanced.js';

const euro = value => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
const percent = value => new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 1 }).format(value);
const byId = id => document.getElementById(id);
const escapeHtml = value => { const node = document.createElement('div'); node.textContent = String(value); return node.innerHTML; };

const scenarioPlans = Object.freeze({
  cycle: [{ regime: 'croissance', months: 60 }, { regime: 'crise', months: 12 }, { regime: 'reprise', months: 36 }, { regime: 'croissance', months: Infinity }],
  croissance: [{ regime: 'croissance', months: Infinity }],
  stagnation: [{ regime: 'stagnation', months: Infinity }],
  crise: [{ regime: 'croissance', months: 24 }, { regime: 'crise', months: 36 }, { regime: 'reprise', months: 24 }, { regime: 'stagnation', months: Infinity }],
  inflation: [{ regime: 'inflation', months: 84 }, { regime: 'stagnation', months: 36 }, { regime: 'croissance', months: Infinity }]
});

const allocation = Object.freeze([
  { id: 'world', label: 'ETF Monde', weight: 0.8, annualReturn: 0.07, annualVolatility: 0.16 },
  { id: 'bonds', label: 'Obligations', weight: 0.1, annualReturn: 0.03, annualVolatility: 0.06 },
  { id: 'gold', label: 'Or', weight: 0.05, annualReturn: 0.035, annualVolatility: 0.14 },
  { id: 'ai', label: 'Technologie / IA', weight: 0.05, annualReturn: 0.09, annualVolatility: 0.28 }
]);

let controller = null;

function readDefinition() {
  const scenario = byId('labScenario').value;
  return {
    portfolioCount: Number(byId('labCount').value),
    years: Number(byId('labYears').value),
    initialAmount: Number(byId('labInitial').value),
    monthlyContribution: Number(byId('labMonthly').value),
    goal: Number(byId('labGoal').value),
    annualInflation: Number(byId('labInflation').value) / 100,
    annualFees: Number(byId('labFees').value) / 100,
    commonCorrelation: Number(byId('labCorrelation').value),
    seed: Number(byId('labSeed').value),
    regimePlan: scenarioPlans[scenario],
    allocation
  };
}

function renderStats(summary) {
  byId('labStats').innerHTML = [
    ['Médiane', euro(summary.nominal.median)],
    ['Scénario 5 %', euro(summary.nominal.p05)],
    ['Objectif atteint', summary.goalProbability == null ? '—' : percent(summary.goalProbability)],
    ['Drawdown sévère', percent(summary.drawdown.p95)]
  ].map(([label, value]) => `<div class="lab-stat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('');
}

function renderReport(report, interpretation) {
  const assumptions = interpretation.assumptions;
  byId('labReport').innerHTML = `
    <section class="lab-report-section"><h3>${escapeHtml(interpretation.verdict)}</h3>${interpretation.executiveSummary.map(item => `<p>${escapeHtml(item)}</p>`).join('')}</section>
    <section class="lab-report-section"><h3>Risque et résistance</h3><p>Drawdown médian : <strong>${percent(interpretation.risk.medianDrawdown)}</strong></p><p>Drawdown au 95e percentile : <strong>${percent(interpretation.risk.severeDrawdown)}</strong></p><p>Drawdown extrême au 99e percentile : <strong>${percent(interpretation.risk.extremeDrawdown)}</strong></p><p>Mois sous les versements cumulés, médiane : <strong>${Math.round(interpretation.risk.medianUnderwaterMonths)}</strong></p></section>
    <section class="lab-report-section"><h3>Hypothèses</h3><p>Inflation : ${percent(assumptions.inflation)} · Frais : ${percent(assumptions.fees)} · Corrélation commune : ${assumptions.correlation}</p><p>Graine : ${assumptions.seed} · Méthode : ${escapeHtml(report.methodology.model)}</p>${assumptions.allocation.map(asset => `<p>${escapeHtml(asset.label)} : ${percent(asset.weight)}, rendement ${percent(asset.annualReturn)}, volatilité ${percent(asset.annualVolatility)}</p>`).join('')}</section>
    <section class="lab-report-section"><h3>Limites</h3>${interpretation.limitations.map(item => `<p>• ${escapeHtml(item)}</p>`).join('')}</section>
    <section class="lab-report-section"><h3>Expériences suivantes</h3>${interpretation.nextExperiments.map(item => `<p>• ${escapeHtml(item)}</p>`).join('')}</section>`;
}

byId('labRun').addEventListener('click', async () => {
  controller = new AbortController();
  byId('labRun').disabled = true;
  byId('labCancel').disabled = false;
  byId('labStatus').textContent = 'Simulation en cours…';
  byId('labProgress').style.width = '0%';
  try {
    const report = await runAdvancedLabSimulationBatched(readDefinition(), {
      batchSize: 200,
      signal: controller.signal,
      onProgress: progress => {
        byId('labProgress').style.width = `${Math.round(progress.ratio * 100)}%`;
        byId('labStatus').textContent = `${progress.completed.toLocaleString('fr-FR')} / ${progress.total.toLocaleString('fr-FR')} portefeuilles simulés`;
      }
    });
    const interpretation = buildExhaustiveLeynorReport(report);
    renderStats(report.summary);
    renderReport(report, interpretation);
    byId('labStatus').textContent = `Terminé en ${(report.summary.elapsedMs / 1000).toFixed(2)} s.`;
  } catch (error) {
    byId('labStatus').textContent = error?.name === 'AbortError' ? 'Simulation annulée.' : `Erreur : ${error.message}`;
  } finally {
    controller = null;
    byId('labRun').disabled = false;
    byId('labCancel').disabled = true;
  }
});

byId('labCancel').addEventListener('click', () => controller?.abort());
