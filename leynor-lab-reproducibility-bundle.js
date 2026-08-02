function text(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} requis.`);
  return value.trim();
}

export function createReproducibilityBundle(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input doit être un objet.');
  const files = [...(input.files ?? [])].map((file, index) => Object.freeze({
    path: text(file.path, `files[${index}].path`),
    checksum: text(file.checksum, `files[${index}].checksum`)
  })).sort((a, b) => a.path.localeCompare(b.path));
  if (files.length === 0) throw new Error('Au moins un fichier reproductible est requis.');
  if (new Set(files.map(file => file.path)).size !== files.length) throw new Error('Chemin de fichier dupliqué.');
  return Object.freeze({
    schemaVersion: 1,
    bundleId: text(input.bundleId, 'bundleId'),
    methodologyReleaseId: text(input.methodologyReleaseId, 'methodologyReleaseId'),
    runtimeVersion: text(input.runtimeVersion, 'runtimeVersion'),
    dependencyLockChecksum: text(input.dependencyLockChecksum, 'dependencyLockChecksum'),
    sourceCommitSha: text(input.sourceCommitSha, 'sourceCommitSha'),
    files: Object.freeze(files),
    serialize() { return JSON.stringify({ schemaVersion: 1, bundleId: this.bundleId, methodologyReleaseId: this.methodologyReleaseId, runtimeVersion: this.runtimeVersion, dependencyLockChecksum: this.dependencyLockChecksum, sourceCommitSha: this.sourceCommitSha, files }); }
  });
}
