import inquirer from 'inquirer';
import { saveConfig, configExists, configPath } from '../utils/configManager.js';

const PROVIDER_DEFAULTS = {
  groq: 'llama-3.3-70b-versatile',
  openai: 'gpt-4o',
  anthropic: 'claude-opus-4-6',
};

/**
 * Interactive setup command.
 * Prompts the user for provider choice, API key, model, and GitHub credentials,
 * then saves the config to ~/.readminator/config.json.
 */
export async function setupCommand() {
  console.log('\nreadminator setup\n');

  if (configExists()) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `Config already exists at ${configPath()}. Overwrite?`,
        default: false,
      },
    ]);
    if (!overwrite) {
      console.log('Setup cancelled.');
      return;
    }
  }

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'provider',
      message: 'Select AI provider:',
      choices: ['groq', 'openai', 'anthropic'],
    },
    {
      type: 'password',
      name: 'apiKey',
      message: 'AI provider API key:',
      validate: (v) => (v.trim() ? true : 'API key cannot be empty'),
    },
    {
      type: 'input',
      name: 'model',
      message: (ans) =>
        `Model name (leave blank for default: ${PROVIDER_DEFAULTS[ans.provider]}):`,
      default: (ans) => PROVIDER_DEFAULTS[ans.provider],
    },
    {
      type: 'password',
      name: 'githubToken',
      message: 'GitHub personal access token (needs repo + pull_request scope):',
      validate: (v) => (v.trim() ? true : 'GitHub token cannot be empty'),
    },
    {
      type: 'input',
      name: 'githubUsername',
      message: 'GitHub username:',
      validate: (v) => (v.trim() ? true : 'GitHub username cannot be empty'),
    },
  ]);

  const config = {
    provider: answers.provider,
    apiKey: answers.apiKey.trim(),
    model: answers.model.trim() || PROVIDER_DEFAULTS[answers.provider],
    githubToken: answers.githubToken.trim(),
    githubUsername: answers.githubUsername.trim(),
  };

  saveConfig(config);

  console.log(`\nConfig saved to ${configPath()}`);
  console.log('Run `readminator run` to start generating READMEs.\n');
}
