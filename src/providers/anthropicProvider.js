import Anthropic from '@anthropic-ai/sdk';
import { BaseProvider } from './baseProvider.js';

const DEFAULT_MODEL = 'claude-opus-4-6';

export class AnthropicProvider extends BaseProvider {
  constructor(apiKey, model = DEFAULT_MODEL) {
    super();
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async generateReadme(summary) {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: this.buildPrompt(summary),
        },
      ],
    });

    // Extract text from the first content block
    const block = response.content.find((b) => b.type === 'text');
    return block?.text ?? '';
  }
}
