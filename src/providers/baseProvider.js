/**
 * BaseProvider defines the interface every AI provider must implement.
 * Extend this class and override `generateReadme`.
 */
export class BaseProvider {
  /**
   * Generate a README.md string from a repository summary.
   * @param {string} summary - Structured text summary of the repository.
   * @returns {Promise<string>} Generated README markdown content.
   */
  async generateReadme(summary) {
    throw new Error('generateReadme() must be implemented by subclass');
  }

  /**
   * Build the standard prompt used by all providers.
   * @param {string} summary
   * @returns {string}
   */
  buildPrompt(summary) {
    return `Act as a senior software engineer.
Analyze the given repository summary and generate a high-quality README.md.

Include:
- Project Title
- Description
- Features (specific, not generic)
- Tech Stack
- Installation
- Usage
- Folder Structure
- Contributing

Avoid generic statements. Make it specific to the repo.
Return ONLY the raw Markdown — no code fences, no explanations outside the document.

Repository Summary:
${summary}`;
  }
}
