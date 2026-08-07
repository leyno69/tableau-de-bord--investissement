import { runMassSimulation } from './leynor-premium-lab.js';
import { runCorrelatedMassSimulation } from './leynor-correlated-lab.js';

const MAX_BATCH_JOBS = 50;

function requiredText(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${name} doit être une chaîne non vide.`);
  }
  return value.trim();
}

function normalizeJobs(jobs) {
  if (!Array.isArray(jobs) || jobs.length === 0 || jobs.length > MAX_BATCH_JOBS) {
    throw new RangeError(`jobs doit contenir entre 1 et ${MAX_BATCH_JOBS} éléments.`);
  }

  const ids = new Set();
  return Object.freeze(jobs.map((job, index) => {
    const id = requiredText(job?.id ?? `job-${index + 1}`, `jobs[${index}].id`);
    if (ids.has(id)) throw new RangeError(`Identifiant de job dupliqué : ${id}.`);
    ids.add(id);

    const type = job?.type ?? 'independent';
    if (type !== 'independent' && type !== 'correlated') {
      throw new RangeError(`jobs[${index}].type doit valoir independent ou correlated.`);
    }
    if (!job?.definition || typeof job.definition !== 'object') {
      throw new TypeError(`jobs[${index}].definition est requise.`);
    }

    return Object.freeze({
      id,
      label: requiredText(job?.label ?? id, `jobs[${index}].label`),
      type,
      definition: job.definition
    });
  }));
}

function abortError() {
  const error = new Error('Exécution du laboratoire annulée.');
  error.name = 'AbortError';
  return error;
}

function frozenProgress(completed, total, currentJobId = null) {
  return Object.freeze({
    completed,
    total,
    ratio: total === 0 ? 1 : completed / total,
    currentJobId
  });
}

export function createLabBatchDefinition({ name = 'Lot LEYNOR', jobs } = {}) {
  return Object.freeze({
    name: requiredText(name, 'name'),
    jobs: normalizeJobs(jobs)
  });
}

export async function runLabBatch(input, options = {}) {
  const definition = input?.jobs && !Object.isFrozen(input)
    ? createLabBatchDefinition(input)
    : input;
  if (!definition?.jobs || !Object.isFrozen(definition)) {
    throw new TypeError('Une définition de lot valide est requise.');
  }

  const signal = options.signal;
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};
  const yieldControl = typeof options.yieldControl === 'function'
    ? options.yieldControl
    : () => new Promise(resolve => setTimeout(resolve, 0));

  const results = [];
  onProgress(frozenProgress(0, definition.jobs.length));

  for (let index = 0; index < definition.jobs.length; index += 1) {
    if (signal?.aborted) throw abortError();
    const job = definition.jobs[index];
    onProgress(frozenProgress(index, definition.jobs.length, job.id));

    const report = job.type === 'correlated'
      ? runCorrelatedMassSimulation(job.definition)
      : runMassSimulation(job.definition);

    results.push(Object.freeze({
      id: job.id,
      label: job.label,
      type: job.type,
      report
    }));

    onProgress(frozenProgress(index + 1, definition.jobs.length, job.id));
    if (index < definition.jobs.length - 1) await yieldControl();
  }

  return Object.freeze({
    definition,
    results: Object.freeze(results),
    methodology: Object.freeze({
      execution: 'Les simulations sont exécutées séquentiellement avec une progression observable et un point d’annulation entre chaque job.',
      reproducibility: 'Chaque job conserve sa propre graine et reste reproductible indépendamment de l’ordre du lot.',
      limitation: 'L’annulation intervient entre deux jobs et ne coupe pas une simulation déjà en cours de calcul.'
    })
  });
}

export { MAX_BATCH_JOBS };
