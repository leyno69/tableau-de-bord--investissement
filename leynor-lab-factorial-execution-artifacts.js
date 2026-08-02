import { createHash } from 'node:crypto';
import { analyzeFactorialResult } from './leynor-lab-factorial-analysis-pipeline.js';
import { runFactorialSensitivity } from './leynor-lab-factorial-sensitivity-engine.js';

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function checksum(value) {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

export function buildExecutionArtifacts(config, metadata = {}) {
  const result = runFactorialSensitivity(config);
  const analysis = analyzeFactorialResult(result);
  const observations = result.replications.map((row) => Object.freeze({ ...row }));
  const manifest = Object.freeze({
    campaignId: result.campaignId,
    generatedAt: metadata.generatedAt ?? null,
    engineCommit: metadata.engineCommit ?? null,
    replicationCount: result.replications.length,
    totalPaths: result.totalPaths,
    cellCount: analysis.cellCount,
    seeds: Object.freeze([...config.seeds]),
    pathsPerReplication: config.pathsPerReplication,
    configChecksum: checksum(config),
    observationsChecksum: checksum(observations),
    analysisChecksum: checksum(analysis),
    limitations: Object.freeze([...(config.limitations ?? [])]),
    notice: 'Synthetic scenario analysis; not a forecast, recommendation or IGL calibration.',
  });

  return Object.freeze({
    manifest,
    observations: Object.freeze(observations),
    analysis,
  });
}

export function validateExecutionArtifacts(artifacts, config) {
  if (!artifacts?.manifest || !Array.isArray(artifacts.observations) || !artifacts.analysis) {
    throw new TypeError('invalid execution artifacts');
  }
  const errors = [];
  if (artifacts.manifest.configChecksum !== checksum(config)) errors.push('config checksum mismatch');
  if (artifacts.manifest.observationsChecksum !== checksum(artifacts.observations)) errors.push('observations checksum mismatch');
  if (artifacts.manifest.analysisChecksum !== checksum(artifacts.analysis)) errors.push('analysis checksum mismatch');
  if (artifacts.manifest.replicationCount !== artifacts.observations.length) errors.push('replication count mismatch');
  if (artifacts.analysis.replicationCount !== artifacts.observations.length) errors.push('analysis replication count mismatch');
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}
