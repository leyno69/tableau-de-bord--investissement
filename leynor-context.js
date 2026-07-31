const REFERENCE_WORDS = /\b(cette?|celui|celle|ceux|celles|lui|elle|ça|cela|cet actif|cette action|cet etf)\b/i;

function normalizeText(value) {
  return String(value ?? '').trim();
}

function positionLabels(position = {}) {
  return [position.name, position.ticker, position.isin]
    .map(normalizeText)
    .filter(Boolean);
}

export function findMentionedPosition(text, positions = []) {
  const normalized = normalizeText(text).toLocaleLowerCase('fr-FR');
  if (!normalized) return null;

  return positions.find(position => positionLabels(position).some(label =>
    normalized.includes(label.toLocaleLowerCase('fr-FR'))
  )) ?? null;
}

export function resolveConversationSubject({ question, conversation = [], positions = [] } = {}) {
  const direct = findMentionedPosition(question, positions);
  if (direct) return Object.freeze({ source: 'question', position: direct });
  if (!REFERENCE_WORDS.test(normalizeText(question))) return null;

  for (const message of [...conversation].reverse()) {
    const position = findMentionedPosition(message?.content, positions);
    if (position) return Object.freeze({ source: 'conversation', position });
  }

  return null;
}

export function buildContextualQuestion({ question, conversation = [], positions = [] } = {}) {
  const normalizedQuestion = normalizeText(question);
  if (!normalizedQuestion) throw new TypeError('La question est obligatoire.');

  const subject = resolveConversationSubject({ question: normalizedQuestion, conversation, positions });
  if (!subject || subject.source === 'question') return normalizedQuestion;

  const label = normalizeText(subject.position.name) || normalizeText(subject.position.ticker);
  const ticker = normalizeText(subject.position.ticker);
  const identity = ticker && !label.includes(ticker) ? `${label} (${ticker})` : label;
  return `${normalizedQuestion}\n\nRéférence conversationnelle résolue : ${identity}.`;
}
