function required(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} requis.`);
  return value.trim();
}

export function createMethodologyReleaseRegistry(entries = []) {
  const normalized = entries.map(entry => Object.freeze({
    releaseId: required(entry.releaseId, 'releaseId'),
    manifestId: required(entry.manifestId, 'manifestId'),
    commitSha: required(entry.commitSha, 'commitSha'),
    status: required(entry.status, 'status'),
    approvedAt: entry.approvedAt == null ? null : required(entry.approvedAt, 'approvedAt'),
    supersedesReleaseId: entry.supersedesReleaseId == null ? null : required(entry.supersedesReleaseId, 'supersedesReleaseId')
  }));
  const ids = new Set();
  for (const entry of normalized) {
    if (ids.has(entry.releaseId)) throw new Error(`releaseId dupliqué : ${entry.releaseId}.`);
    ids.add(entry.releaseId);
    if (!['candidate', 'approved', 'withdrawn'].includes(entry.status)) throw new Error(`Statut inconnu : ${entry.status}.`);
    if (entry.status === 'approved' && !entry.approvedAt) throw new Error('Une release approuvée exige approvedAt.');
  }
  const ordered = [...normalized].sort((a, b) => a.releaseId.localeCompare(b.releaseId));
  return Object.freeze({
    schemaVersion: 1,
    entries: Object.freeze(ordered),
    latestApproved() { return ordered.filter(item => item.status === 'approved').at(-1) ?? null; },
    serialize() { return JSON.stringify({ schemaVersion: 1, entries: ordered }); }
  });
}
