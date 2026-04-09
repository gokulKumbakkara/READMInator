#!/usr/bin/env node

/**
 * READMInator MCP Server
 *
 * Exposes READMInator's capabilities as MCP tools so any MCP client
 * (e.g. Claude Desktop, Claude Code) can generate GitHub READMEs via AI.
 *
 * Tools exposed:
 *   - readminator_setup            Configure credentials
 *   - readminator_list_repos       List repos eligible for README generation
 *   - readminator_preview_readme   Generate README for a single repo (dry run, no push)
 *   - readminator_run_repo         Full pipeline for one repo (push + PR)
 *   - readminator_run_all          Full pipeline for all eligible repos
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import axios from 'axios';

import { saveConfig, loadConfig, configExists } from './src/utils/configManager.js';
import { getProvider } from './src/providers/providerFactory.js';
import { getEligibleRepos, processSingleRepo, processAllRepos } from './src/services/pipeline.js';

// ---------------------------------------------------------------------------
// Server bootstrap
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: 'readminator',
  version: '1.0.0',
});

// ---------------------------------------------------------------------------
// Tool: readminator_setup
// ---------------------------------------------------------------------------

server.tool(
  'readminator_setup',
  'Configure READMInator with AI provider credentials and GitHub token. Saves config to ~/.readminator/config.json.',
  {
    provider: z.enum(['groq', 'openai', 'anthropic']).describe('AI provider to use'),
    apiKey: z.string().min(1).describe('API key for the selected AI provider'),
    model: z.string().optional().describe('Model name (uses provider default if omitted)'),
    githubToken: z.string().min(1).describe('GitHub personal access token (repo + pull_requests scope)'),
    githubUsername: z.string().min(1).describe('GitHub username whose repos will be processed'),
  },
  async ({ provider, apiKey, model, githubToken, githubUsername }) => {
    const DEFAULTS = {
      groq: 'llama-3.3-70b-versatile',
      openai: 'gpt-4o',
      anthropic: 'claude-opus-4-6',
    };

    const config = {
      provider,
      apiKey,
      model: model?.trim() || DEFAULTS[provider],
      githubToken,
      githubUsername,
    };

    saveConfig(config);

    return {
      content: [
        {
          type: 'text',
          text: `READMInator configured successfully.\nProvider: ${provider} (${config.model})\nGitHub user: ${githubUsername}`,
        },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool: readminator_list_repos
// ---------------------------------------------------------------------------

server.tool(
  'readminator_list_repos',
  'List GitHub repositories that are eligible for AI README generation (skips forks, archived, and repos with adequate READMEs).',
  {
    language: z.string().optional().describe('Filter by primary programming language (e.g. "typescript")'),
    nameFilter: z.string().optional().describe('Filter repos whose name contains this substring'),
  },
  async ({ language, nameFilter }) => {
    const config = requireConfig();
    const eligible = await getEligibleRepos(config, { language, nameFilter });

    if (eligible.length === 0) {
      return text('No eligible repositories found. All repos may already have adequate READMEs.');
    }

    const lines = eligible.map(
      (r) => `• ${r.name}  [${r.language ?? 'unknown'}]  ${r.html_url}`
    );

    return text(`Found ${eligible.length} eligible repo(s):\n\n${lines.join('\n')}`);
  }
);

// ---------------------------------------------------------------------------
// Tool: readminator_preview_readme
// ---------------------------------------------------------------------------

server.tool(
  'readminator_preview_readme',
  'Generate a README.md for a single repository using AI and return the content — nothing is pushed to GitHub.',
  {
    repoName: z.string().min(1).describe('Repository name (e.g. "my-project")'),
  },
  async ({ repoName }) => {
    const config = requireConfig();
    const provider = getProvider(config);

    // Find the repo object from GitHub API
    const repo = await fetchRepoObject(config, repoName);

    const result = await processSingleRepo(repo, config, provider, {
      dry: true,
      log: () => {}, // suppress logs in MCP context
    });

    if (!result.success) {
      return text(`Failed to generate README for "${repoName}": ${result.error}`);
    }

    return text(result.readmeContent);
  }
);

// ---------------------------------------------------------------------------
// Tool: readminator_run_repo
// ---------------------------------------------------------------------------

server.tool(
  'readminator_run_repo',
  'Run the full pipeline for a single repository: generate README, push branch, open Pull Request.',
  {
    repoName: z.string().min(1).describe('Repository name (e.g. "my-project")'),
    merge: z.boolean().optional().default(false).describe('Auto-merge the PR after creation'),
  },
  async ({ repoName, merge }) => {
    const config = requireConfig();
    const provider = getProvider(config);

    const repo = await fetchRepoObject(config, repoName);

    const result = await processSingleRepo(repo, config, provider, {
      dry: false,
      autoMerge: merge,
      log: () => {},
    });

    if (!result.success) {
      return text(`Failed for "${repoName}": ${result.error}`);
    }

    const mergeNote = result.merged ? ' and merged' : '';
    return text(`PR created${mergeNote} for "${repoName}": ${result.prUrl}`);
  }
);

// ---------------------------------------------------------------------------
// Tool: readminator_run_all
// ---------------------------------------------------------------------------

server.tool(
  'readminator_run_all',
  'Run the full pipeline for all eligible repositories: generate READMEs, push branches, open Pull Requests.',
  {
    language: z.string().optional().describe('Only process repos with this primary language'),
    nameFilter: z.string().optional().describe('Only process repos whose name contains this substring'),
    merge: z.boolean().optional().default(false).describe('Auto-merge each PR after creation'),
    concurrency: z.number().int().min(1).max(10).optional().default(3).describe('Number of repos to process in parallel'),
  },
  async ({ language, nameFilter, merge, concurrency }) => {
    const config = requireConfig();
    const provider = getProvider(config);

    const { success, failed } = await processAllRepos(
      config,
      provider,
      { language, nameFilter },
      { autoMerge: merge, concurrency, log: () => {} }
    );

    const lines = [
      `Processed ${success.length + failed.length} repo(s).`,
      `✓ Success (${success.length}): ${success.map((r) => r.repoName).join(', ') || 'none'}`,
      `✗ Failed  (${failed.length}): ${failed.map((r) => `${r.repoName} — ${r.error}`).join('; ') || 'none'}`,
    ];

    if (success.length > 0) {
      lines.push('\nPull Requests:');
      success.forEach((r) => {
        const mergeNote = r.merged ? ' [merged]' : '';
        lines.push(`  ${r.repoName}: ${r.prUrl}${mergeNote}`);
      });
    }

    return text(lines.join('\n'));
  }
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Throw a user-friendly error if config is missing. */
function requireConfig() {
  if (!configExists()) {
    throw new Error(
      'READMInator is not configured. Call readminator_setup first.'
    );
  }
  return loadConfig();
}

/** Fetch a single repo object from the GitHub API by name. */
async function fetchRepoObject(config, repoName) {
  const { data } = await axios.get(
    `https://api.github.com/repos/${config.githubUsername}/${repoName}`,
    {
      headers: {
        Authorization: `token ${config.githubToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'readminator',
      },
    }
  );
  return data;
}

/** Shorthand to build a plain text MCP content response. */
function text(str) {
  return { content: [{ type: 'text', text: str }] };
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
