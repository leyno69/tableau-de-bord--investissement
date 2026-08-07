const ALLOWED_RISK = new Set(['conservative', 'balanced', 'dynamic']);

export class GeneratePortfolioRecommendations {
  execute({ analysis, profile = {} }) {
    if (!analysis || typeof analysis !== 'object' || !Array.isArray(analysis.insights)) throw new TypeError('analysis.insights doit être un tableau.');
    const riskProfile = String(profile.riskProfile ?? 'balanced').toLowerCase();
    if (!ALLOWED_RISK.has(riskProfile)) throw new RangeError('riskProfile doit valoir conservative, balanced ou dynamic.');
    const horizonYears = positive(profile.horizonYears ?? 10, 'horizonYears');
    const emergencyFundReady = profile.emergencyFundReady !== false;
    const recommendations = [];

    for (const insight of analysis.insights) {
      switch (insight.code) {
        case 'STALE_MARKET_DATA':
        case 'INCOMPLETE_MARKET_DATA':
          recommendations.push(rec('REFRESH_DATA', 'DATA', 'Actualiser les données avant toute décision.', 'Les calculs reposent sur des cotations incomplètes ou anciennes.', 'low'));
          break;
        case 'CONCENTRATION_WARNING':
        case 'CONCENTRATION_CRITICAL':
          recommendations.push(rec('REVIEW_CONCENTRATION', 'RISK', 'Examiner la concentration et définir une cible maximale par position.', insight.message, riskProfile === 'conservative' ? 'high' : 'medium'));
          break;
        case 'DRAWDOWN_WARNING':
        case 'DRAWDOWN_CRITICAL':
          recommendations.push(rec('REVIEW_DRAWDOWN_PLAN', 'RISK', 'Vérifier que le niveau de baisse reste compatible avec le plan et l’horizon.', insight.message, 'high'));
          break;
        case 'HIGH_CASH':
          recommendations.push(rec('DEFINE_CASH_PLAN', 'ALLOCATION', emergencyFundReady ? 'Définir un calendrier d’investissement progressif pour les liquidités excédentaires.' : 'Séparer d’abord l’épargne de précaution des liquidités destinées à investir.', insight.message, 'medium'));
          break;
        case 'LOW_DIVERSIFICATION':
          recommendations.push(rec('REVIEW_DIVERSIFICATION', 'ALLOCATION', 'Comparer l’allocation actuelle à une allocation cible diversifiée.', insight.message, 'medium'));
          break;
        default:
          recommendations.push(rec('REVIEW_INSIGHT', 'REVIEW', 'Examiner ce constat avant de modifier le portefeuille.', insight.message, 'low'));
      }
    }

    if (horizonYears < 3) recommendations.push(rec('LIMIT_VOLATILITY', 'SUITABILITY', 'Éviter d’augmenter le risque sans vérifier le besoin de liquidité à court terme.', `Horizon déclaré : ${horizonYears} an(s).`, 'high'));
    if (!emergencyFundReady) recommendations.push(rec('BUILD_EMERGENCY_FUND', 'SUITABILITY', 'Prioriser la constitution d’une épargne de précaution avant d’augmenter les investissements risqués.', 'Le profil indique que l’épargne de précaution n’est pas prête.', 'high'));

    const unique = [...new Map(recommendations.map(item => [item.code, item])).values()];
    return Object.freeze({
      generatedFromConfidence: Number(analysis.confidence ?? 0),
      riskProfile, horizonYears,
      disclaimer: 'Ces recommandations sont des pistes de revue et ne déclenchent aucune opération.',
      recommendations: Object.freeze(unique.sort((a, b) => priority(b.priority) - priority(a.priority) || a.code.localeCompare(b.code)))
    });
  }
}

function rec(code, category, action, rationale, priorityValue) { return Object.freeze({ code, category, action, rationale, priority: priorityValue, execution: 'manual-review-required' }); }
function priority(value) { return value === 'high' ? 3 : value === 'medium' ? 2 : 1; }
function positive(value, field) { const number = Number(value); if (!Number.isFinite(number) || number <= 0) throw new RangeError(`${field} doit être strictement positif.`); return number; }
