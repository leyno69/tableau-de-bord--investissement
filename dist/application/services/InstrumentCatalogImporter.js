import { Instrument } from '../../domain/instrument/Instrument.js';

export class InstrumentImportError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'InstrumentImportError';
    this.code = code;
    this.details = Object.freeze(details);
  }
}

export class InstrumentCatalogImporter {
  constructor({ instrumentRepository }) {
    for (const method of ['findById', 'save']) {
      if (!instrumentRepository || typeof instrumentRepository[method] !== 'function') {
        throw new TypeError(`instrumentRepository doit implémenter ${method}().`);
      }
    }
    this.repository = instrumentRepository;
  }

  async import({ format = 'json', content, duplicatePolicy = 'reject', dryRun = false } = {}) {
    const normalizedFormat = requiredChoice(format, ['json', 'csv'], 'format');
    const policy = requiredChoice(duplicatePolicy, ['reject', 'skip', 'replace'], 'duplicatePolicy');
    if (typeof dryRun !== 'boolean') throw new TypeError('dryRun doit être un booléen.');

    let rows;
    try {
      rows = normalizedFormat === 'json' ? parseJson(content) : parseCsv(content);
    } catch (error) {
      throw new InstrumentImportError(error.message, 'IMPORT_PARSE_ERROR');
    }

    const accepted = [];
    const rejected = [];
    const seen = new Set();

    for (let index = 0; index < rows.length; index += 1) {
      const line = index + 1;
      try {
        const instrument = new Instrument(rows[index]);
        if (seen.has(instrument.id)) throw new InstrumentImportError(`Identifiant dupliqué dans l’import : ${instrument.id}.`, 'DUPLICATE_IN_IMPORT');
        seen.add(instrument.id);
        const existing = await this.repository.findById(instrument.id);
        if (existing && policy === 'reject') throw new InstrumentImportError(`L’instrument "${instrument.id}" existe déjà.`, 'INSTRUMENT_CONFLICT');
        if (existing && policy === 'skip') {
          accepted.push(Object.freeze({ line, id: instrument.id, action: 'skipped', instrument }));
        } else {
          accepted.push(Object.freeze({ line, id: instrument.id, action: existing ? 'replaced' : 'created', instrument }));
        }
      } catch (error) {
        rejected.push(Object.freeze({ line, code: error.code ?? 'INVALID_INSTRUMENT', message: error.message }));
      }
    }

    const report = {
      format: normalizedFormat,
      dryRun,
      duplicatePolicy: policy,
      total: rows.length,
      accepted: accepted.length,
      rejected: rejected.length,
      applied: 0,
      entries: [...accepted.map(({ instrument, ...entry }) => entry), ...rejected]
        .sort((a, b) => a.line - b.line)
    };

    if (rejected.length > 0) return Object.freeze(report);
    if (!dryRun) {
      for (const entry of accepted) {
        if (entry.action !== 'skipped') await this.repository.save(entry.instrument);
      }
      report.applied = accepted.filter(entry => entry.action !== 'skipped').length;
      await this.repository.flush?.();
    }
    return Object.freeze(report);
  }
}

function parseJson(content) {
  const value = typeof content === 'string' ? JSON.parse(content) : content;
  const rows = Array.isArray(value) ? value : value?.instruments;
  if (!Array.isArray(rows)) throw new TypeError('Le JSON doit être un tableau ou contenir instruments[].');
  return rows;
}

function parseCsv(content) {
  if (typeof content !== 'string' || content.trim() === '') throw new TypeError('Le contenu CSV est obligatoire.');
  const records = csvRecords(content);
  if (records.length < 2) return [];
  const headers = records[0].map(value => value.trim());
  return records.slice(1).filter(row => row.some(value => value.trim() !== '')).map(row => {
    const object = Object.fromEntries(headers.map((header, index) => [header, row[index]?.trim() ?? '']));
    return {
      id: object.id,
      type: object.type,
      name: object.name,
      isin: object.isin || null,
      ticker: object.ticker || null,
      venue: object.venue || null,
      currency: object.currency || 'EUR',
      providerMappings: object.providerMappings ? JSON.parse(object.providerMappings) : []
    };
  });
}

function csvRecords(text) {
  const rows = []; let row = []; let field = ''; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ',') { row.push(field); field = ''; }
    else if (character === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += character;
  }
  if (quoted) throw new TypeError('Champ CSV non terminé.');
  if (field !== '' || row.length > 0) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  return rows;
}

function requiredChoice(value, choices, field) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!choices.includes(normalized)) throw new RangeError(`${field} doit valoir ${choices.join(' ou ')}.`);
  return normalized;
}
