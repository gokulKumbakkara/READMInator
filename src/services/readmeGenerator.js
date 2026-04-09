/**
 * Thin orchestration layer: pass a repo summary to the AI provider
 * and return the generated README content.
 */

/**
 * Generate a README string for a repository.
 * @param {object} provider - An instance of BaseProvider.
 * @param {string} summary - Repository summary from repoAnalyzer.
 * @returns {Promise<string>}
 */
export async function generateReadme(provider, summary) {
  const content = await provider.generateReadme(summary);

  // Strip any accidental wrapping code fences some models add
  return stripCodeFences(content);
}

/**
 * Remove leading/trailing markdown code fences if the model wrapped its output.
 * e.g. ```markdown ... ``` or ``` ... ```
 * @param {string} text
 * @returns {string}
 */
function stripCodeFences(text) {
  return text.replace(/^```(?:markdown)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
}
