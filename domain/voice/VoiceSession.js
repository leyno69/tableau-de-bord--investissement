const STATUSES = new Set(['idle', 'listening', 'processing', 'speaking', 'ended']);

export class VoiceSession {
  constructor({ id, status = 'idle', wakeWord = 'Dis LEYNOR', turns = [], startedAt = new Date().toISOString(), endedAt = null } = {}) {
    if (typeof id !== 'string' || !id.trim()) throw new TypeError('L’identifiant de session vocale est requis.');
    if (!STATUSES.has(status)) throw new RangeError(`Statut de session vocale invalide : ${status}.`);
    this.id = id.trim();
    this.status = status;
    this.wakeWord = wakeWord;
    this.turns = Object.freeze([...turns]);
    this.startedAt = new Date(startedAt).toISOString();
    this.endedAt = endedAt ? new Date(endedAt).toISOString() : null;
    Object.freeze(this);
  }

  withStatus(status) {
    return new VoiceSession({ ...this, status });
  }

  appendTurn(turn) {
    return new VoiceSession({ ...this, turns: [...this.turns, Object.freeze({ ...turn })] });
  }

  end(at = new Date().toISOString()) {
    return new VoiceSession({ ...this, status: 'ended', endedAt: at });
  }
}
