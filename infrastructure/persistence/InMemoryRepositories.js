import { Transaction } from '../../domain/transaction/Transaction.js';
import { PortfolioSnapshot } from '../../domain/analytics/PortfolioSnapshot.js';
import { AlertEvent } from '../../domain/alerts/AlertEvent.js';
import { PortfolioPreferences } from '../../domain/portfolio/PortfolioPreferences.js';

const text = (value, field) => {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`);
  return value.trim();
};

export class InMemoryTransactionRepository {
  #items = new Map();

  async save(transaction) {
    if (!(transaction instanceof Transaction)) throw new TypeError('transaction doit être une instance de Transaction.');
    const existing = this.#items.get(transaction.id);
    if (existing && JSON.stringify(existing.toJSON()) !== JSON.stringify(transaction.toJSON())) {
      throw new RangeError(`La transaction ${transaction.id} existe déjà avec un contenu différent.`);
    }
    this.#items.set(transaction.id, transaction);
    return transaction;
  }

  async findById(id) { return this.#items.get(text(id, 'id')) ?? null; }

  async listByPortfolio(portfolioId) {
    const normalized = text(portfolioId, 'portfolioId');
    return Object.freeze([...this.#items.values()]
      .filter(item => item.portfolioId === normalized)
      .sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt) || a.id.localeCompare(b.id)));
  }
}

export class InMemoryPortfolioSnapshotRepository {
  #items = new Map();

  async save(snapshot) {
    if (!(snapshot instanceof PortfolioSnapshot)) throw new TypeError('snapshot doit être une instance de PortfolioSnapshot.');
    const key = `${snapshot.portfolioId}:${snapshot.capturedAt}`;
    const existing = this.#items.get(key);
    if (existing && JSON.stringify(existing.toJSON()) !== JSON.stringify(snapshot.toJSON())) {
      throw new RangeError('Un snapshot différent existe déjà pour ce portefeuille et cet horodatage.');
    }
    this.#items.set(key, snapshot);
    return snapshot;
  }

  async listByPortfolio(portfolioId, { from = null, to = null } = {}) {
    const normalized = text(portfolioId, 'portfolioId');
    const fromTime = from == null ? -Infinity : this.#date(from, 'from');
    const toTime = to == null ? Infinity : this.#date(to, 'to');
    if (fromTime > toTime) throw new RangeError('from ne peut pas être postérieur à to.');
    return Object.freeze([...this.#items.values()]
      .filter(item => item.portfolioId === normalized)
      .filter(item => Date.parse(item.capturedAt) >= fromTime && Date.parse(item.capturedAt) <= toTime)
      .sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt)));
  }

  #date(value, field) {
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) throw new TypeError(`${field} doit être une date valide.`);
    return timestamp;
  }
}

export class InMemoryAlertEventRepository {
  #items = new Map();

  async saveAll(events) {
    if (!Array.isArray(events)) throw new TypeError('events doit être un tableau.');
    for (const event of events) {
      if (!(event instanceof AlertEvent)) throw new TypeError('Chaque événement doit être une instance de AlertEvent.');
      const fingerprintKey = `${event.portfolioId}:${event.fingerprint}`;
      if (![...this.#items.values()].some(item => `${item.portfolioId}:${item.fingerprint}` === fingerprintKey)) {
        this.#items.set(event.id, event);
      }
    }
    return Object.freeze([...events]);
  }

  async listByPortfolio(portfolioId) {
    const normalized = text(portfolioId, 'portfolioId');
    return Object.freeze([...this.#items.values()]
      .filter(item => item.portfolioId === normalized)
      .sort((a, b) => Date.parse(a.triggeredAt) - Date.parse(b.triggeredAt) || a.id.localeCompare(b.id)));
  }

  async listFingerprints(portfolioId) {
    const events = await this.listByPortfolio(portfolioId);
    return Object.freeze(events.map(item => item.fingerprint));
  }
}

export class InMemoryPortfolioPreferencesRepository {
  #items = new Map();

  async save(preferences) {
    if (!(preferences instanceof PortfolioPreferences)) throw new TypeError('preferences doit être une instance de PortfolioPreferences.');
    this.#items.set(preferences.portfolioId, preferences);
    return preferences;
  }

  async findByPortfolio(portfolioId) {
    return this.#items.get(text(portfolioId, 'portfolioId')) ?? null;
  }
}
