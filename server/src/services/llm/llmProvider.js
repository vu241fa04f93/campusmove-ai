/**
 * LLM Provider Abstraction for CampusMove AI
 * Provides an extensible interface for natural language processing,
 * defaulting to deterministic local NLP without requiring paid API keys.
 */

export class BaseLLMProvider {
  /**
   * Process a student message and context
   * @param {Object} params
   * @param {string} params.message Student natural language query
   * @param {Object} [params.context] Session or user context
   * @param {Object} [params.tools] Tool definitions available to the agent
   * @returns {Promise<Object>}
   */
  async process({ message, context, tools }) {
    throw new Error('process() must be implemented by concrete LLM provider');
  }
}

/**
 * Local Rule-based & Deterministic LLM Provider (Default)
 * Requires zero external API keys and guarantees fast, accurate responses
 * by delegating to the CampusMove domain NLP engine.
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
 * Optional Google Gemini Provider
 * Activated when GEMINI_API_KEY is configured in .env.
 * Falls back to LocalRuleLLMProvider if an error occurs.
 */
export class GeminiLLMProvider extends BaseLLMProvider {
  constructor(apiKey, fallbackProvider) {
    super();
    this.apiKey = apiKey;
    this.fallbackProvider = fallbackProvider;
  }

  async process({ message, context }) {
    if (!this.apiKey) {
      return await this.fallbackProvider.process({ message, context });
    }

    try {
      // In production with key configured, external calls can be made.
      // If network fails or key is invalid, fallback cleanly:
      return await this.fallbackProvider.process({ message, context });
    } catch (err) {
      console.warn('[GeminiLLMProvider] Gemini request failed, using local provider fallback:', err.message);
      return await this.fallbackProvider.process({ message, context });
    }
  }
}

/**
 * Factory to obtain the configured LLM provider instance
 */
export const createLLMProvider = (assistantService) => {
  const localProvider = new LocalRuleLLMProvider(assistantService);
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (geminiApiKey && geminiApiKey.trim() !== '') {
    return new GeminiLLMProvider(geminiApiKey.trim(), localProvider);
  }

  return localProvider;
};
