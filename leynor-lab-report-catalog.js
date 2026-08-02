function requiredText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${field} doit être une chaîne non vide.`);
  }
  return value.trim();
}

function requiredIsoDate(value, field) {
  const text = requiredText(value, field);
  if (!Number.isFinite(Date.parse(text))) throw new TypeError(`${field} doit être une date ISO valide.`);
  return text;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

export function createLabReportEntry({
  simulationId,
  reproducibilityId,
  campaignId = null,
  generatedAt,
  engineVersion,
  seed,
  report,
  pdf = null
}) {
  if (!Number.isSafeInteger(seed)) throw new TypeError('seed doit être un entier sûr.');
  if (!report || typeof report !== 'object' || !Array.isArray(report.sections)) {
    throw new TypeError('report doit être un rapport Premium complet.');
  }

  const normalizedPdf = pdf == null ? null : {
    filename: requiredText(pdf.filename, 'pdf.filename'),
    mimeType: requiredText(pdf.mimeType, 'pdf.mimeType'),
    size: Number(pdf.size)
  };
  if (normalizedPdf && (!Number.isSafeInteger(normalizedPdf.size) || normalizedPdf.size <= 0)) {
    throw new TypeError('pdf.size doit être un entier strictement positif.');
  }

  return deepFreeze({
    schemaVersion: 1,
    simulationId: requiredText(simulationId, 'simulationId'),
    reproducibilityId: requiredText(reproducibilityId, 'reproducibilityId'),
    campaignId: campaignId == null ? null : requiredText(campaignId, 'campaignId'),
    generatedAt: requiredIsoDate(generatedAt, 'generatedAt'),
    engineVersion: requiredText(engineVersion, 'engineVersion'),
    seed,
    report: clone(report),
    pdf: normalizedPdf
  });
}

function entryFingerprint(entry) {
  return JSON.stringify(entry);
}

export class LabReportCatalog {
  #entries = new Map();

  constructor(entries = []) {
    if (!Array.isArray(entries)) throw new TypeError('entries doit être un tableau.');
    entries.forEach(entry => this.add(entry));
  }

  add(input) {
    const entry = createLabReportEntry(input);
    const existing = this.#entries.get(entry.reproducibilityId);
    if (existing) {
      if (entryFingerprint(existing) !== entryFingerprint(entry)) {
        throw new Error(`Conflit de rapport pour ${entry.reproducibilityId}.`);
      }
      return existing;
    }
    this.#entries.set(entry.reproducibilityId, entry);
    return entry;
  }

  get(reproducibilityId) {
    return this.#entries.get(requiredText(reproducibilityId, 'reproducibilityId')) ?? null;
  }

  list({ campaignId = undefined } = {}) {
    const normalizedCampaignId = campaignId === undefined ? undefined : requiredText(campaignId, 'campaignId');
    return Object.freeze([...this.#entries.values()]
      .filter(entry => normalizedCampaignId === undefined || entry.campaignId === normalizedCampaignId)
      .sort((left, right) => left.generatedAt.localeCompare(right.generatedAt)
        || left.reproducibilityId.localeCompare(right.reproducibilityId)));
  }

  get size() {
    return this.#entries.size;
  }

  toJSON() {
    return deepFreeze({
      schemaVersion: 1,
      entries: clone(this.list())
    });
  }

  static fromJSON(snapshot) {
    if (!snapshot || snapshot.schemaVersion !== 1 || !Array.isArray(snapshot.entries)) {
      throw new TypeError('Snapshot de catalogue LEYNOR invalide ou incompatible.');
    }
    return new LabReportCatalog(snapshot.entries);
  }
}
