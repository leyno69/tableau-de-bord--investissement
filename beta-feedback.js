function requiredText(value, name) {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw new TypeError(`${name} est obligatoire.`);
  return normalized;
}

function rating(value, name) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 5) {
    throw new TypeError(`${name} doit être compris entre 1 et 5.`);
  }
  return number;
}

export function createBetaFeedback({ tester = 'Anonyme', area, ease, usefulness, confidence, category, message, scenario = 'non renseigné', createdAt = new Date().toISOString() } = {}) {
  return Object.freeze({
    id: `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tester: String(tester || 'Anonyme').trim() || 'Anonyme',
    area: requiredText(area, 'area'),
    ease: rating(ease, 'ease'),
    usefulness: rating(usefulness, 'usefulness'),
    confidence: rating(confidence, 'confidence'),
    category: requiredText(category, 'category'),
    message: requiredText(message, 'message'),
    scenario: String(scenario || 'non renseigné').trim(),
    createdAt: requiredText(createdAt, 'createdAt')
  });
}

export function summarizeBetaFeedback(items = []) {
  if (!Array.isArray(items)) throw new TypeError('items doit être une liste.');
  if (!items.length) return Object.freeze({ count: 0, ease: 0, usefulness: 0, confidence: 0 });
  const average = key => items.reduce((sum, item) => sum + Number(item[key] || 0), 0) / items.length;
  return Object.freeze({
    count: items.length,
    ease: average('ease'),
    usefulness: average('usefulness'),
    confidence: average('confidence')
  });
}

export function exportFeedbackJson(items = []) {
  return JSON.stringify({ exportedAt: new Date().toISOString(), feedback: items }, null, 2);
}
