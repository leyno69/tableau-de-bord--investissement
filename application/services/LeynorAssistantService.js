export class LeynorAssistantService {
  constructor({ pipeline, languageModelProvider } = {}) {
    if (!pipeline || typeof pipeline.prepare !== 'function') throw new TypeError('pipeline doit exposer prepare().');
    if (!languageModelProvider || typeof languageModelProvider.generate !== 'function') throw new TypeError('languageModelProvider doit exposer generate().');
    this.pipeline = pipeline;
    this.languageModelProvider = languageModelProvider;
    Object.freeze(this);
  }

  async answer(input = {}) {
    const prepared = this.pipeline.prepare(input);
    const completion = await this.languageModelProvider.generate({
      prompt: prepared.prompt,
      temperature: input.temperature ?? 0.2,
      maxTokens: input.maxTokens ?? 900
    });
    return Object.freeze({
      answer: completion.text,
      weather: prepared.weather,
      context: prepared.context,
      plan: prepared.plan,
      model: Object.freeze({
        provider: completion.provider,
        name: completion.model,
        usage: completion.usage
      })
    });
  }
}
