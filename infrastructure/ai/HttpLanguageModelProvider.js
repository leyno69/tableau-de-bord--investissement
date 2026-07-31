import { LeynorLanguageModelProvider } from '../../application/ports/LeynorLanguageModelProvider.js';

export class HttpLanguageModelProvider extends LeynorLanguageModelProvider {
  constructor({ baseUrl, apiKey = '', model, timeoutMilliseconds = 20_000, fetchImplementation = globalThis.fetch } = {}) {
    super();
    if (typeof baseUrl !== 'string' || !baseUrl.trim()) throw new TypeError('baseUrl est obligatoire.');
    if (typeof model !== 'string' || !model.trim()) throw new TypeError('model est obligatoire.');
    if (!Number.isInteger(timeoutMilliseconds) || timeoutMilliseconds < 1) throw new RangeError('timeoutMilliseconds est invalide.');
    if (typeof fetchImplementation !== 'function') throw new TypeError('fetchImplementation doit être une fonction.');
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = typeof apiKey === 'string' ? apiKey.trim() : '';
    this.model = model.trim();
    this.timeoutMilliseconds = timeoutMilliseconds;
    this.fetchImplementation = fetchImplementation;
    Object.freeze(this);
  }

  async generate({ prompt, temperature = 0.2, maxTokens = 900 } = {}) {
    const source = prompt?.toJSON instanceof Function ? prompt.toJSON() : prompt;
    if (!source || typeof source.system !== 'string' || typeof source.user !== 'string') {
      throw new TypeError('prompt doit contenir system et user.');
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMilliseconds);
    timeout.unref?.();
    try {
      const response = await this.fetchImplementation(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {})
        },
        body: JSON.stringify({
          model: this.model,
          temperature,
          max_tokens: maxTokens,
          messages: [
            { role: 'system', content: source.system },
            { role: 'user', content: source.user }
          ]
        }),
        signal: controller.signal
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(`Le fournisseur IA a répondu ${response.status}.`);
      const text = body?.choices?.[0]?.message?.content;
      if (typeof text !== 'string' || !text.trim()) throw new Error('Le fournisseur IA n’a renvoyé aucun texte.');
      return Object.freeze({
        text: text.trim(),
        provider: 'openai-compatible-http',
        model: body?.model ?? this.model,
        usage: Object.freeze({
          inputTokens: body?.usage?.prompt_tokens ?? null,
          outputTokens: body?.usage?.completion_tokens ?? null,
          totalTokens: body?.usage?.total_tokens ?? null
        })
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}
