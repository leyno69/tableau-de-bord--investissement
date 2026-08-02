function requiredText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${field} doit être une chaîne non vide.`);
  }
  return value.trim();
}

function requiredArray(value, field, minimum = 1) {
  if (!Array.isArray(value) || value.length < minimum) {
    throw new TypeError(`${field} doit contenir au moins ${minimum} élément(s).`);
  }
  return value;
}

function requiredBoolean(value, field) {
  if (typeof value !== 'boolean') throw new TypeError(`${field} doit être un booléen.`);
  return value;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

const ALLOWED_TYPES = new Set([
  'independent-simulation',
  'historical-data',
  'external-source',
  'reproduction',
  'holdout-validation',
  'contradiction'
]);

const ALLOWED_DIRECTIONS = new Set(['supportive', 'contradictory', 'inconclusive']);

export function createEvidenceItem(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('evidence doit être un objet.');
  }

  const type = requiredText(input.type, 'type');
  const direction = requiredText(input.direction, 'direction');
  if (!ALLOWED_TYPES.has(type)) throw new TypeError(`Type de preuve inconnu : ${type}.`);
  if (!ALLOWED_DIRECTIONS.has(direction)) throw new TypeError(`Direction de preuve inconnue : ${direction}.`);

  return deepFreeze({
    schemaVersion: 1,
    evidenceId: requiredText(input.evidenceId, 'evidenceId'),
    conclusionId: requiredText(input.conclusionId, 'conclusionId'),
    type,
    direction,
    sourceReference: requiredText(input.sourceReference, 'sourceReference'),
    sourceFingerprint: requiredText(input.sourceFingerprint, 'sourceFingerprint'),
    observedAt: requiredText(input.observedAt, 'observedAt'),
    method: requiredText(input.method, 'method'),
    observation: requiredText(input.observation, 'observation'),
    independentlyReproduced: requiredBoolean(input.independentlyReproduced, 'independentlyReproduced'),
    holdoutValidated: requiredBoolean(input.holdoutValidated, 'holdoutValidated'),
    limitations: Object.freeze(
      requiredArray(input.limitations, 'limitations', 1)
        .map((value, index) => requiredText(value, `limitations[${index}]`))
    )
  });
}

export function createEvidenceRegistry(items = []) {
  const normalizedItems = items.map(createEvidenceItem);
  const ids = new Set();
  const fingerprints = new Set();

  for (const item of normalizedItems) {
    if (ids.has(item.evidenceId)) throw new Error(`evidenceId dupliqué : ${item.evidenceId}.`);
    if (fingerprints.has(item.sourceFingerprint)) {
      throw new Error(`sourceFingerprint dupliqué : ${item.sourceFingerprint}.`);
    }
    ids.add(item.evidenceId);
    fingerprints.add(item.sourceFingerprint);
  }

  const ordered = [...normalizedItems].sort((left, right) =>
    left.observedAt.localeCompare(right.observedAt) || left.evidenceId.localeCompare(right.evidenceId)
  );

  return deepFreeze({
    schemaVersion: 1,
    items: ordered,
    add(itemInput) {
      const item = createEvidenceItem(itemInput);
      const byId = ordered.find(existing => existing.evidenceId === item.evidenceId);
      if (byId) {
        if (JSON.stringify(byId) === JSON.stringify(item)) return createEvidenceRegistry(ordered);
        throw new Error(`Conflit de preuve pour evidenceId : ${item.evidenceId}.`);
      }
      const byFingerprint = ordered.find(existing => existing.sourceFingerprint === item.sourceFingerprint);
      if (byFingerprint) {
        throw new Error(`sourceFingerprint déjà enregistré par ${byFingerprint.evidenceId}.`);
      }
      return createEvidenceRegistry([...ordered, item]);
    },
    forConclusion(conclusionId) {
      const id = requiredText(conclusionId, 'conclusionId');
      return Object.freeze(ordered.filter(item => item.conclusionId === id));
    },
    summarize(conclusionId) {
      const id = requiredText(conclusionId, 'conclusionId');
      const selected = ordered.filter(item => item.conclusionId === id);
      const byDirection = {
        supportive: selected.filter(item => item.direction === 'supportive').length,
        contradictory: selected.filter(item => item.direction === 'contradictory').length,
        inconclusive: selected.filter(item => item.direction === 'inconclusive').length
      };
      const independentlyReproducedCount = selected.filter(item => item.independentlyReproduced).length;
      const holdoutValidatedCount = selected.filter(item => item.holdoutValidated).length;
      const sourceTypes = [...new Set(selected.map(item => item.type))].sort();

      return deepFreeze({
        conclusionId: id,
        evidenceCount: selected.length,
        byDirection,
        independentlyReproducedCount,
        holdoutValidatedCount,
        sourceTypes,
        contradictionsPresent: byDirection.contradictory > 0,
        limitations: [
          'Cette synthèse inventorie les éléments disponibles ; elle ne calcule aucun niveau de preuve.',
          'Le nombre d’éléments ne remplace pas l’évaluation de leur qualité, de leur indépendance et de leurs limites.',
          'La présence d’éléments favorables n’annule jamais les contradictions enregistrées.',
          'Cette synthèse ne constitue ni un niveau de confiance, ni un IGL, ni une recommandation d’investissement.'
        ]
      });
    },
    serialize() {
      return JSON.stringify({ schemaVersion: 1, items: ordered });
    }
  });
}

export function restoreEvidenceRegistry(serialized) {
  if (typeof serialized !== 'string' || serialized.trim() === '') {
    throw new TypeError('serialized doit être une chaîne JSON non vide.');
  }
  let parsed;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new Error('Registre de preuves JSON invalide.');
  }
  if (!parsed || parsed.schemaVersion !== 1 || !Array.isArray(parsed.items)) {
    throw new Error('Version de registre de preuves incompatible.');
  }
  return createEvidenceRegistry(parsed.items);
}
