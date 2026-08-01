const GREETINGS = /^(bonjour|bonsoir|salut|hello|coucou|hey|bonjour leynor|salut leynor)[\s!.?]*$/i;
const THANKS = /^(merci|merci beaucoup|super merci|parfait merci)[\s!.?]*$/i;
const SHORT_VAGUE = /^(aide-moi|aide moi|que peux-tu faire|qu'est-ce que tu peux faire|quoi de neuf|analyse|conseille-moi|conseille moi)[\s!.?]*$/i;

const INTENTS = Object.freeze([
  ['simulation', /\b(simul|projection|scénario|scenario|monte[- ]carlo|dans \d+ ans|par mois pendant)\b/i],
  ['portfolio_analysis', /\b(mon portefeuille|portefeuille|allocation|concentration|liquidités|liquidites|rééquilibr|reequilibr)\b/i],
  ['comparison', /\b(compare|comparaison|versus|\bvs\b|différence entre|difference entre)\b/i],
  ['education', /\b(explique|comprendre|c'est quoi|qu'est-ce que|définition|definition|comment fonctionne)\b/i],
  ['asset_analysis', /\b(action|etf|obligation|crypto|bitcoin|or|nvidia|amd|s&p|world|nasdaq|ticker|isin)\b/i],
  ['market_analysis', /\b(marché|marche|tendance|secteur|macro|inflation|taux|bourse)\b/i]
]);

function normalize(value) {
  return String(value ?? '').trim();
}

function responseMode(question) {
  if (/\b(exhaustif|très détaillé|tres detaille|rapport complet|expert|approfondi)\b/i.test(question)) return 'expert';
  if (/\b(brièvement|brievement|court|rapide|en deux phrases|résume|resume)\b/i.test(question)) return 'brief';
  return 'standard';
}

export class LeynorConversationIntentRouter {
  route({ question, user = {} } = {}) {
    const text = normalize(question);
    if (!text) return Object.freeze({ intent: 'clarification', mode: 'brief', directAnswer: 'Que souhaites-tu analyser ou comprendre ?' });

    if (GREETINGS.test(text)) {
      const name = normalize(user.firstName || user.name);
      return Object.freeze({
        intent: 'greeting',
        mode: 'brief',
        directAnswer: `Bonjour${name ? ` ${name}` : ''} ! Que souhaites-tu faire aujourd’hui : analyser ton portefeuille, étudier un actif, comparer deux stratégies ou lancer une simulation ?`
      });
    }

    if (THANKS.test(text)) {
      return Object.freeze({ intent: 'conversation', mode: 'brief', directAnswer: 'Avec plaisir. Quelle est la prochaine question que tu souhaites examiner ?' });
    }

    if (SHORT_VAGUE.test(text) || text.length < 4) {
      return Object.freeze({
        intent: 'clarification',
        mode: 'brief',
        directAnswer: 'Précise ce que tu veux examiner : ton portefeuille, un actif, une comparaison, un risque ou une simulation.'
      });
    }

    const detected = INTENTS.find(([, pattern]) => pattern.test(text));
    return Object.freeze({ intent: detected?.[0] ?? 'general_finance', mode: responseMode(text), directAnswer: null });
  }
}

export { responseMode };
