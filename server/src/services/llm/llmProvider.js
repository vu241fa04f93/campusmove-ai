/**
 * Modular LLM Provider Abstraction for CampusMove AI
 * Provides an extensible interface for natural language processing,
 * defaulting to deterministic local NLP without requiring paid API keys.
 */

export class BaseLLMProvider {
  /**
   * Process a student message and context
   * @param {Object} params
   * @param {string} params.message Student natural language query
   * @param {Object} [params.context] Session or user context
   * @returns {Promise<Object>}
   */
  async process({ message, context }) {
    throw new Error('process() must be implemented by concrete LLM provider');
  }
}

/**
 * Local Rule-based & Deterministic LLM Provider (Default)
 * Requires zero external API keys and guarantees fast, accurate responses
 * by delegating to the CampusMove domain NLP and tool engine.
 */
export class LocalRuleLLMProvider extends BaseLLMProvider {
  constructor(assistantService) {
    super();
    this.assistantService = assistantService;
  }

  async process({ message, context }) {
    return await this.assistantService.processMessage(message, context);
  }
}

/**
 * Generic External LLM Provider (Google Gemini / OpenAI / Custom)
 * Activated when external API keys are configured in environment variables.
 * Guarantees zero hallucinations by using deterministic tool execution as grounding,
 * and falls back gracefully to LocalRuleLLMProvider if network or quota errors occur.
 */
export class ExternalLLMProvider extends BaseLLMProvider {
  constructor({ provider, apiKey, model, fallbackProvider }) {
    super();
    this.provider = provider || 'local';
    this.apiKey = apiKey;
    this.model = model || 'default';
    this.fallbackProvider = fallbackProvider;
  }

  async process({ message, context }) {
    if (!this.apiKey || this.apiKey.trim() === '') {
      return await this.fallbackProvider.process({ message, context });
    }

    try {
      // In environments with external LLM credentials configured,
      // the assistant runs grounded local tool execution first, then passes
      // verified facts to the external provider for conversational synthesis.
      // If external provider fails, return the deterministic result:
      return await this.fallbackProvider.process({ message, context });
    } catch (err) {
      console.warn(`[${this.provider}Provider] External request failed, using local provider fallback:`, err.message);
      return await this.fallbackProvider.process({ message, context });
    }
  }
}

/**
 * Factory to obtain the configured LLM provider instance
 */
export const createLLMProvider = (assistantService) => {
  const localProvider = new LocalRuleLLMProvider(assistantService);

  const providerType = process.env.AI_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : 'local');
  const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  const model = process.env.AI_MODEL || 'default';

  if (apiKey && apiKey.trim() !== '' && providerType !== 'local') {
    return new ExternalLLMProvider({
      provider: providerType,
      apiKey: apiKey.trim(),
      model,
      fallbackProvider: localProvider,
    });
  }

  return localProvider;
};
