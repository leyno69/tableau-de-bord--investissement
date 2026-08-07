import { ResponsePolicy } from '../../domain/leynor/ResponsePolicy.js';

export class LeynorPersonalityPolicyService {
  createPolicy({
    lossRate = 0,
    gainRate = 0,
    userConcern = false,
    marketUncertainty = 'normal',
    dataQuality = 'complete',
    expertise = 'beginner',
    fomoPrompt = false,
    materialRisk = false
  } = {}) {
    const loss = LeynorPersonalityPolicyService.#rate(lossRate, 'lossRate');
    const gain = LeynorPersonalityPolicyService.#rate(gainRate, 'gainRate');
    const uncertainty = LeynorPersonalityPolicyService.#enum(marketUncertainty, ['low', 'normal', 'high'], 'marketUncertainty');
    const quality = LeynorPersonalityPolicyService.#enum(dataQuality, ['complete', 'partial', 'stale'], 'dataQuality');
    const userExpertise = LeynorPersonalityPolicyService.#enum(expertise, ['beginner', 'intermediate', 'expert'], 'expertise');
    const seriousLoss = loss <= -0.2;
    const sensitiveContext = seriousLoss || Boolean(userConcern);
    const uncertainContext = uncertainty === 'high' || quality !== 'complete';
    const riskContext = Boolean(materialRisk) || Boolean(fomoPrompt) || seriousLoss;

    return new ResponsePolicy({
      tone: sensitiveContext ? 'reassuring' : gain >= 0.1 ? 'positive' : 'calm',
      humorLevel: sensitiveContext || uncertainContext || riskContext ? 'disabled' : 'light',
      metaphorLevel: seriousLoss ? 'light' : uncertainContext ? 'light' : 'normal',
      empathyLevel: sensitiveContext ? 'high' : 'normal',
      explanationDepth: userExpertise === 'expert' ? 'concise' : userExpertise === 'beginner' || riskContext ? 'detailed' : 'standard',
      jargonLevel: userExpertise === 'expert' ? 'technical' : 'simple',
      riskDisclosure: riskContext ? 'required' : 'standard',
      uncertaintyDisclosure: uncertainContext ? 'required' : 'standard'
    });
  }

  static #rate(value, field) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < -1 || number > 100) throw new RangeError(`${field} est invalide.`);
    return number;
  }

  static #enum(value, allowed, field) {
    if (!allowed.includes(value)) throw new RangeError(`${field} est invalide.`);
    return value;
  }
}
