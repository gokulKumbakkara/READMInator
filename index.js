#!/usr/bin/env node

import { program } from 'commander';
import { setupCommand } from './src/cli/setup.js';
import { runCommand } from './src/cli/run.js';

program
  .name('readminator')
  .description('AI-powered CLI tool that generates high-quality README.md files for GitHub repositories')
  .version('1.0.0');

program
  .command('setup')
  .description('Configure AI provider, API keys, and GitHub credentials')
  .action(setupCommand);

program
  .command('run')
  .description('Fetch repos and generate README.md files via AI')
  .option('--dry', 'Dry run: analyze and generate without pushing or creating PRs')
  .option('--merge', 'Auto-merge the PR after creation')
  .option('--language <lang>', 'Filter repositories by primary language')
  .option('--filter <name>', 'Filter repositories by name (substring match)')
  .option('--concurrency <n>', 'Number of repos to process in parallel', '3')
  .action(runCommand);

program.parse(process.argv);
