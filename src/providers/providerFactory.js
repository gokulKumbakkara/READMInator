import { GroqProvider } from './groqProvider.js';
import { OpenAIProvider } from './openaiProvider.js';
import { AnthropicProvider } from './anthropicProvider.js';

/**
 * Return the appropriate AI provider instance based on the config.
 * @param {object} config - Loaded user config.
 * @returns {BaseProvider}
 */
export function getProvider(config) {
  const { provider, apiKey, model } = config;

  switch (provider.toLowerCase()) {
    case 'groq':
      return new GroqProvider(apiKey, model || undefined);
    case 'openai':
      return new OpenAIProvider(apiKey, model || undefined);
    case 'anthropic':
      return new AnthropicProvider(apiKey, model || undefined);
    default:
      throw new Error(
        `Unknown provider "${provider}". Valid options: groq, openai, anthropic`
      );
  }
}
