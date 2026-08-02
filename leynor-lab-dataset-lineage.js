function text(value, field) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} requis.`);
  return value.trim();
}

export function createDatasetLineage(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input doit être un objet.');
  const transformations = [...(input.transformations ?? [])].map((item, index) => Object.freeze({
    id: text(item.id, `transformations[${index}].id`),
    version: text(item.version, `transformations[${index}].version`),
    inputChecksum: text(item.inputChecksum, `transformations[${index}].inputChecksum`),
    outputChecksum: text(item.outputChecksum, `transformations[${index}].outputChecksum`)
  }));
  if (transformations.length === 0) throw new Error('Au moins une transformation est requise.');
  if (new Set(transformations.map(item => item.id)).size !== transformations.length) throw new Error('Transformation dupliquée.');
  return Object.freeze({
    schemaVersion: 1,
    datasetId: text(input.datasetId, 'datasetId'),
    sourceName: text(input.sourceName, 'sourceName'),
    sourceVersion: text(input.sourceVersion, 'sourceVersion'),
    acquiredAt: text(input.acquiredAt, 'acquiredAt'),
    licenseReference: text(input.licenseReference, 'licenseReference'),
    transformations: Object.freeze(transformations),
    finalChecksum: text(input.finalChecksum, 'finalChecksum')
  });
}
