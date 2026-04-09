import OpenAI from 'openai';
import { BaseProvider } from './baseProvider.js';

const DEFAULT_MODEL = 'gpt-4o';

export class OpenAIProvider extends BaseProvider {
  constructor(apiKey, model = DEFAULT_MODEL) {
    super();
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async generateReadme(summary) {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'user',
          content: this.buildPrompt(summary),
        },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    });

    return response.choices[0]?.message?.content ?? '';
  }
}
