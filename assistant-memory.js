import { MemoryService } from './application/services/MemoryService.js';
import { LocalStorageUserMemoryRepository } from './infrastructure/memory/LocalStorageUserMemoryRepository.js';
import { LocalStorageConversationMemoryRepository } from './infrastructure/memory/LocalStorageConversationMemoryRepository.js';

const USER_ID = 'oscar';
const CONVERSATION_ID = 'leynor-web-assistant';

const memoryService = new MemoryService({
  userMemoryRepository: new LocalStorageUserMemoryRepository({ storage: localStorage }),
  conversationMemoryRepository: new LocalStorageConversationMemoryRepository({ storage: localStorage })
});

function message(role, content) {
  return {
    id: `${Date.now()}-${role}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
    metadata: { channel: 'web' }
  };
}

export async function loadAssistantHistory(limit = 20) {
  const context = await memoryService.buildContext({
    userId: USER_ID,
    conversationId: CONVERSATION_ID,
    messageLimit: limit
  });
  return context.conversation.messages.map(({ role, content }) => ({ role, content }));
}

export async function rememberAssistantExchange(question, answer) {
  await memoryService.appendConversationMessage({
    conversationId: CONVERSATION_ID,
    userId: USER_ID,
    message: message('user', question)
  });
  await memoryService.appendConversationMessage({
    conversationId: CONVERSATION_ID,
    userId: USER_ID,
    message: message('assistant', answer)
  });
}

export async function rememberInvestorPreference(key, value) {
  return memoryService.rememberUserEntry({ userId: USER_ID, key, value });
}
