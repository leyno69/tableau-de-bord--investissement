const GREETINGS = /^(bonjour|bonsoir|salut|hello|coucou|hey|bonjour leynor|salut leynor)[\s!.?]*$/i;
const THANKS = /^(merci|merci beaucoup|super merci|parfait merci)[\s!.?]*$/i;
const SHORT_VAGUE = /^(aide-moi|aide moi|que peux-tu faire|qu'est-ce que tu peux faire|quoi de neuf|analyse|conseille-moi|conseille moi)[\s!.?]*$/i;
const CASUAL_CONVERSATION = /\b(comment vas-tu|quel âge|quel age|qui es-tu|parle-moi de toi|raconte|blague|météo|meteo|quel temps|bonjour.*temps|ça va|ca va)\b/i;

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
        directAnswer: `Bonjour${name ? ` ${name}` : ''} ! Que souhaites-tu faire aujourd’hui : discuter, analyser ton portefeuille, étudier un actif ou lancer une simulation ?`
      });
    }

    if (THANKS.test(text)) {
      return Object.freeze({ intent: 'conversation', mode: 'brief', directAnswer: 'Avec plaisir. Que souhaites-tu faire ensuite ?' });
    }

    if (SHORT_VAGUE.test(text) || text.length < 4) {
      return Object.freeze({
        intent: 'clarification',
        mode: 'brief',
        directAnswer: 'Précise ce que tu veux examiner : une question générale, ton portefeuille, un actif, une comparaison ou une simulation.'
      });
    }

    if (CASUAL_CONVERSATION.test(text)) {
      return Object.freeze({ intent: 'general_conversation', mode: 'brief', directAnswer: null });
    }

    const detected = INTENTS.find(([, pattern]) => pattern.test(text));
    if (detected) return Object.freeze({ intent: detected[0], mode: responseMode(text), directAnswer: null });
    return Object.freeze({ intent: 'general_conversation', mode: 'brief', directAnswer: null });
  }
}

export { responseMode };
