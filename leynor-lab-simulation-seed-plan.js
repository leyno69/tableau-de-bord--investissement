function text(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} requis.`);
  return value.trim();
}

export function createSimulationSeedPlan(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input doit être un objet.');
  if (!Number.isInteger(input.baseSeed) || input.baseSeed < 0) throw new TypeError('baseSeed invalide.');
  if (!Number.isInteger(input.replicationCount) || input.replicationCount < 2) throw new TypeError('replicationCount doit être au moins 2.');
  const modulus = 2147483647;
  const seeds = Array.from({ length: input.replicationCount }, (_, index) => (input.baseSeed + (index * 104729)) % modulus);
  if (new Set(seeds).size !== seeds.length) throw new Error('Le plan de graines contient des doublons.');
  return Object.freeze({
    schemaVersion: 1,
    planId: text(input.planId, 'planId'),
    campaignId: text(input.campaignId, 'campaignId'),
    algorithm: 'base-plus-prime-offset-v1',
    baseSeed: input.baseSeed,
    replicationCount: input.replicationCount,
    seeds: Object.freeze(seeds)
  });
}
