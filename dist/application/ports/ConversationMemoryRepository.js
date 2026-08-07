export class ConversationMemoryRepository {
  async getByConversationId(_conversationId) {
    throw new Error('ConversationMemoryRepository.getByConversationId() doit être implémentée.');
  }

  async save(_memory) {
    throw new Error('ConversationMemoryRepository.save() doit être implémentée.');
  }
}
