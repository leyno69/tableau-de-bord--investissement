import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

import { Transaction } from '../../domain/transaction/Transaction.js';
import { PortfolioSnapshot } from '../../domain/analytics/PortfolioSnapshot.js';
import { AlertEvent } from '../../domain/alerts/AlertEvent.js';
import { PortfolioPreferences } from '../../domain/portfolio/PortfolioPreferences.js';
import { Portfolio } from '../../domain/portfolio/Portfolio.js';
import { Account } from '../../domain/account/Account.js';
import { Money } from '../../domain/money/Money.js';

export async function openJsonFilePortfolioRepositories({ filePath, fileSystem = defaultFileSystem() } = {}) {
  const store = new JsonPortfolioStore({ filePath, fileSystem });
  await store.load();
  return Object.freeze({
    portfolios: new JsonEntityRepository(store, 'portfolios', Portfolio),
    accounts: new JsonEntityRepository(store, 'accounts', Account),
    transactions: new JsonTransactionRepository(store),
    snapshots: new JsonSnapshotRepository(store),
    alerts: new JsonAlertRepository(store),
    preferences: new JsonPreferencesRepository(store),
    flush: () => store.flush()
  });
}

class JsonPortfolioStore {
  constructor({ filePath, fileSystem }) {
    if (typeof filePath !== 'string' || filePath.trim() === '') throw new TypeError('filePath doit être une chaîne non vide.');
    for (const method of ['mkdir', 'readFile', 'open', 'rename', 'rm']) if (typeof fileSystem?.[method] !== 'function') throw new TypeError(`fileSystem doit implémenter ${method}().`);
    this.filePath = resolve(filePath.trim());
    this.fileSystem = fileSystem;
    this.state = emptyState();
    this.writeQueue = Promise.resolve();
  }

  async load() {
    let text;
    try { text = await this.fileSystem.readFile(this.filePath, 'utf8'); }
    catch (error) { if (error?.code === 'ENOENT') return; throw error; }
    let payload;
    try { payload = JSON.parse(text); }
    catch (cause) { throw new SyntaxError(`Le stockage JSON "${this.filePath}" est invalide.`, { cause }); }
    if (!payload || payload.version !== 1) throw new TypeError('Le stockage doit utiliser version=1.');
    for (const field of ['transactions', 'snapshots', 'alerts', 'preferences']) if (!Array.isArray(payload[field])) throw new TypeError(`${field} doit être un tableau.`);
    for (const field of ['portfolios', 'accounts']) if (payload[field] != null && !Array.isArray(payload[field])) throw new TypeError(`${field} doit être un tableau.`);
    this.state = {
      portfolios: new Map((payload.portfolios ?? []).map(value => { const item = new Portfolio(value); return [item.id, item]; })),
      accounts: new Map((payload.accounts ?? []).map(value => { const item = new Account(value); return [item.id, item]; })),
      transactions: new Map(payload.transactions.map(value => { const item = new Transaction(value); return [item.id, item]; })),
      snapshots: new Map(payload.snapshots.map(value => { const item = hydrateSnapshot(value); return [`${item.portfolioId}:${item.capturedAt}`, item]; })),
      alerts: new Map(payload.alerts.map(value => { const item = new AlertEvent(value); return [item.id, item]; })),
      preferences: new Map(payload.preferences.map(value => { const item = new PortfolioPreferences(value); return [item.portfolioId, item]; }))
    };
  }

  mutate(action) { const result = action(this.state); return this.#schedulePersist().then(() => result); }
  async flush() { await this.writeQueue; }
  #schedulePersist() { const operation = this.writeQueue.then(() => this.#persist()); this.writeQueue = operation.catch(() => {}); return operation; }

  async #persist() {
    await this.fileSystem.mkdir(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;
    const payload = JSON.stringify({
      version: 1,
      portfolios: sorted(this.state.portfolios.values(), item => item.id).map(item => item.toJSON()),
      accounts: sorted(this.state.accounts.values(), item => item.id).map(item => item.toJSON()),
      transactions: sorted(this.state.transactions.values(), item => item.id).map(item => item.toJSON()),
      snapshots: sorted(this.state.snapshots.values(), item => `${item.portfolioId}:${item.capturedAt}`).map(item => item.toJSON()),
      alerts: sorted(this.state.alerts.values(), item => item.id).map(item => item.toJSON()),
      preferences: sorted(this.state.preferences.values(), item => item.portfolioId).map(item => item.toJSON())
    }, null, 2) + '\n';
    let handle;
    try {
      handle = await this.fileSystem.open(temporaryPath, 'wx');
      await handle.writeFile(payload, 'utf8'); await handle.sync(); await handle.close(); handle = null;
      await this.fileSystem.rename(temporaryPath, this.filePath);
    } catch (error) {
      await handle?.close().catch(() => {}); await this.fileSystem.rm(temporaryPath, { force: true }).catch(() => {}); throw error;
    }
  }
}

export class JsonEntityRepository {
  constructor(store, collection, EntityType) { this.store = store; this.collection = collection; this.EntityType = EntityType; }
  async save(entity) {
    if (!(entity instanceof this.EntityType)) throw new TypeError(`entity doit être une instance de ${this.EntityType.name}.`);
    return this.store.mutate(state => { state[this.collection].set(entity.id, entity); return entity; });
  }
  async findById(id) { return this.store.state[this.collection].get(text(id, 'id')) ?? null; }
  async list() { return Object.freeze(sorted(this.store.state[this.collection].values(), item => item.id)); }
}

export class JsonTransactionRepository {
  constructor(store) { this.store = store; }
  async save(transaction) {
    if (!(transaction instanceof Transaction)) throw new TypeError('transaction doit être une instance de Transaction.');
    return this.store.mutate(state => {
      const existing = state.transactions.get(transaction.id);
      if (existing && JSON.stringify(existing.toJSON()) !== JSON.stringify(transaction.toJSON())) throw new RangeError(`La transaction ${transaction.id} existe déjà avec un contenu différent.`);
      state.transactions.set(transaction.id, transaction); return transaction;
    });
  }
  async findById(id) { return this.store.state.transactions.get(text(id, 'id')) ?? null; }
  async listByPortfolio(portfolioId) { const id = text(portfolioId, 'portfolioId'); return Object.freeze([...this.store.state.transactions.values()].filter(item => item.portfolioId === id).sort((a, b) => Date.parse(a.executedAt) - Date.parse(b.executedAt) || a.id.localeCompare(b.id))); }
}

export class JsonSnapshotRepository {
  constructor(store) { this.store = store; }
  async save(snapshot) {
    if (!(snapshot instanceof PortfolioSnapshot)) throw new TypeError('snapshot doit être une instance de PortfolioSnapshot.');
    return this.store.mutate(state => { const key = `${snapshot.portfolioId}:${snapshot.capturedAt}`; const existing = state.snapshots.get(key); if (existing && JSON.stringify(existing.toJSON()) !== JSON.stringify(snapshot.toJSON())) throw new RangeError('Un snapshot différent existe déjà pour cet horodatage.'); state.snapshots.set(key, snapshot); return snapshot; });
  }
  async listByPortfolio(portfolioId, { from = null, to = null } = {}) {
    const id = text(portfolioId, 'portfolioId'); const fromTime = from == null ? -Infinity : date(from, 'from'); const toTime = to == null ? Infinity : date(to, 'to');
    if (fromTime > toTime) throw new RangeError('from ne peut pas être postérieur à to.');
    return Object.freeze([...this.store.state.snapshots.values()].filter(item => item.portfolioId === id).filter(item => Date.parse(item.capturedAt) >= fromTime && Date.parse(item.capturedAt) <= toTime).sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt)));
  }
}

export class JsonAlertRepository {
  constructor(store) { this.store = store; }
  async saveAll(events) {
    if (!Array.isArray(events)) throw new TypeError('events doit être un tableau.');
    return this.store.mutate(state => { for (const event of events) { if (!(event instanceof AlertEvent)) throw new TypeError('Chaque événement doit être une instance de AlertEvent.'); const duplicate = [...state.alerts.values()].some(item => item.portfolioId === event.portfolioId && item.fingerprint === event.fingerprint); if (!duplicate) state.alerts.set(event.id, event); } return Object.freeze([...events]); });
  }
  async listByPortfolio(portfolioId) { const id = text(portfolioId, 'portfolioId'); return Object.freeze([...this.store.state.alerts.values()].filter(item => item.portfolioId === id).sort((a, b) => Date.parse(a.triggeredAt) - Date.parse(b.triggeredAt) || a.id.localeCompare(b.id))); }
  async listFingerprints(portfolioId) { return Object.freeze((await this.listByPortfolio(portfolioId)).map(item => item.fingerprint)); }
}

export class JsonPreferencesRepository {
  constructor(store) { this.store = store; }
  async save(preferences) { if (!(preferences instanceof PortfolioPreferences)) throw new TypeError('preferences doit être une instance de PortfolioPreferences.'); return this.store.mutate(state => { state.preferences.set(preferences.portfolioId, preferences); return preferences; }); }
  async findByPortfolio(portfolioId) { return this.store.state.preferences.get(text(portfolioId, 'portfolioId')) ?? null; }
}

function hydrateSnapshot(value) { return new PortfolioSnapshot({ ...value, totalValue: new Money(value.totalValue.amount, value.totalValue.currency) }); }
function emptyState() { return { portfolios: new Map(), accounts: new Map(), transactions: new Map(), snapshots: new Map(), alerts: new Map(), preferences: new Map() }; }
function sorted(values, key) { return [...values].sort((a, b) => key(a).localeCompare(key(b))); }
function text(value, field) { if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} doit être une chaîne non vide.`); return value.trim(); }
function date(value, field) { const timestamp = Date.parse(value); if (!Number.isFinite(timestamp)) throw new TypeError(`${field} doit être une date valide.`); return timestamp; }
function defaultFileSystem() { return Object.freeze({ mkdir, readFile, open, rename, rm }); }
