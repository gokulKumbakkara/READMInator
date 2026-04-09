import Groq from 'groq-sdk';
import { BaseProvider } from './baseProvider.js';

const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

export class GroqProvider extends BaseProvider {
  constructor(apiKey, model = DEFAULT_MODEL) {
    super();
    this.client = new Groq({ apiKey });
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
