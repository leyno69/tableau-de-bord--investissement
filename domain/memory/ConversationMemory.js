function freezeMessage(message) {
  if (!message || typeof message !== 'object') throw new TypeError('message doit être un objet.');
  if (!['user', 'assistant', 'system'].includes(message.role)) throw new TypeError('role de message invalide.');
  if (typeof message.content !== 'string' || !message.content.trim()) throw new TypeError('content est obligatoire.');
  return Object.freeze({
    id: String(message.id ?? ''),
    role: message.role,
    content: message.content.trim(),
    createdAt: new Date(message.createdAt ?? 0).toISOString(),
    metadata: Object.freeze({ ...(message.metadata ?? {}) })
  });
}

export class ConversationMemory {
  constructor({ conversationId, userId, messages = [], summary = '', version = 1 } = {}) {
    if (typeof conversationId !== 'string' || !conversationId.trim()) throw new TypeError('conversationId est obligatoire.');
    if (typeof userId !== 'string' || !userId.trim()) throw new TypeError('userId est obligatoire.');
    if (!Number.isInteger(version) || version < 1) throw new TypeError('version doit être un entier positif.');
    this.conversationId = conversationId.trim();
    this.userId = userId.trim();
    this.messages = Object.freeze(messages.map(freezeMessage));
    this.summary = String(summary).trim();
    this.version = version;
    Object.freeze(this);
  }

  append(message) {
    return new ConversationMemory({
      conversationId: this.conversationId,
      userId: this.userId,
      messages: [...this.messages, message],
      summary: this.summary,
      version: this.version + 1
    });
  }

  withSummary(summary) {
    return new ConversationMemory({
      conversationId: this.conversationId,
      userId: this.userId,
      messages: this.messages,
      summary,
      version: this.version + 1
    });
  }
}
