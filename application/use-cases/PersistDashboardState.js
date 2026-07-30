/**
 * Persiste les sorties durables d'une exécution du tableau de bord.
 *
 * La valorisation, la performance et l'allocation restent des projections
 * recalculables. Seuls le snapshot courant et les nouveaux événements d'alerte
 * sont conservés ici.
 */
export class PersistDashboardState {
  constructor({ snapshotRepository, alertEventRepository }) {
    PersistDashboardState.#method(snapshotRepository, 'save', 'snapshotRepository');
    PersistDashboardState.#method(alertEventRepository, 'saveAll', 'alertEventRepository');
    this.snapshotRepository = snapshotRepository;
    this.alertEventRepository = alertEventRepository;
  }

  async execute(dashboard) {
    if (!dashboard || typeof dashboard !== 'object') throw new TypeError('dashboard doit être un objet.');
    if (!dashboard.currentSnapshot) throw new TypeError('dashboard.currentSnapshot est obligatoire.');
    if (!dashboard.alerts || !Array.isArray(dashboard.alerts.events)) {
      throw new TypeError('dashboard.alerts.events doit être un tableau.');
    }

    const [snapshot, alerts] = await Promise.all([
      this.snapshotRepository.save(dashboard.currentSnapshot),
      this.alertEventRepository.saveAll(dashboard.alerts.events)
    ]);

    return Object.freeze({
      portfolioId: dashboard.portfolioId,
      snapshot,
      alerts,
      persistedAlertCount: alerts.length
    });
  }

  static #method(value, method, field) {
    if (!value || typeof value[method] !== 'function') throw new TypeError(`${field} doit implémenter ${method}().`);
  }
}
