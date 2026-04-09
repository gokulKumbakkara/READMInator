import os from 'os';
import fs from 'fs';
import path from 'path';
import simpleGit from 'simple-git';
import pLimit from 'p-limit';

import { loadConfig } from '../utils/configManager.js';
import { getProvider } from '../providers/providerFactory.js';
import { fetchAllRepos, filterRepos, createPullRequest, mergePullRequest, getDefaultBranch } from '../services/githubService.js';
import { analyzeRepo } from '../services/repoAnalyzer.js';
import { generateReadme } from '../services/readmeGenerator.js';

const AI_BRANCH = 'ai/readme-update';
const WORK_DIR = path.join(os.tmpdir(), 'readminator');

/**
 * Main `run` command handler.
 * @param {object} options - CLI options from Commander.
 */
export async function runCommand(options) {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }

  const isDry = Boolean(options.dry);
  const autoMerge = !isDry && Boolean(options.merge);
  const concurrency = Math.max(1, parseInt(options.concurrency ?? '3', 10));
  const filters = {
    language: options.language,
    nameFilter: options.filter,
  };

  const provider = getProvider(config);

  console.log(`\nreadminator run${isDry ? ' (dry run)' : ''}`);
  console.log(`Provider   : ${config.provider} / ${config.model}`);
  console.log(`User       : ${config.githubUsername}`);
  console.log(`Auto-merge : ${autoMerge ? 'yes' : 'no'}`);
  console.log(`Concurrency: ${concurrency}\n`);

  // Ensure work directory exists
  fs.mkdirSync(WORK_DIR, { recursive: true });

  // 1. Fetch repos
  console.log('Fetching repositories...');
  let allRepos;
  try {
    allRepos = await fetchAllRepos(config.githubUsername, config.githubToken);
  } catch (err) {
    console.error(`Failed to fetch repositories: ${err.message}`);
    process.exit(1);
  }
  console.log(`Found ${allRepos.length} total repos.`);

  // 2. Filter repos
  console.log('Filtering repos (skip forks, archived, good READMEs)...');
  const eligible = await filterRepos(allRepos, config.githubToken, filters);
  console.log(`${eligible.length} repos eligible for README generation.\n`);

  if (eligible.length === 0) {
    console.log('Nothing to do. All repos already have adequate READMEs.');
    return;
  }

  // 3. Process repos with concurrency limit
  const limit = pLimit(concurrency);
  const results = { success: [], failed: [], skipped: [] };

  const tasks = eligible.map((repo) =>
    limit(() => processRepo(repo, config, provider, isDry, autoMerge, results))
  );

  await Promise.allSettled(tasks);

  // 4. Summary
  console.log('\n--- Summary ---');
  console.log(`Success : ${results.success.length}`);
  console.log(`Failed  : ${results.failed.length}`);
  console.log(`Skipped : ${results.skipped.length}`);

  if (results.failed.length > 0) {
    console.log('\nFailed repos:');
    results.failed.forEach(({ name, error }) =>
      console.log(`  ${name}: ${error}`)
    );
  }
}

// ---------------------------------------------------------------------------
// Per-repo processing
// ---------------------------------------------------------------------------

/**
 * Full pipeline for a single repository.
 * @param {object} repo - GitHub repo object.
 * @param {object} config - Loaded user config.
 * @param {object} provider - AI provider instance.
 * @param {boolean} isDry - Skip push/PR when true.
 * @param {boolean} autoMerge - Merge PR immediately after creation.
 * @param {object} results - Shared results collector.
 */
async function processRepo(repo, config, provider, isDry, autoMerge, results) {
  const repoName = repo.name;
  const owner = repo.owner.login;
  const cloneDir = path.join(WORK_DIR, repoName);

  console.log(`[${repoName}] Starting...`);

  try {
    // Clone the repository
    await cloneRepo(repo.clone_url, cloneDir, config.githubToken);
    console.log(`[${repoName}] Cloned.`);

    // Analyze codebase
    const summary = analyzeRepo(cloneDir, repoName);

    // Generate README via AI
    console.log(`[${repoName}] Generating README with ${config.provider}...`);
    const readmeContent = await generateReadme(provider, summary);

    // Write README.md
    const readmePath = path.join(cloneDir, 'README.md');
    fs.writeFileSync(readmePath, readmeContent, 'utf-8');
    console.log(`[${repoName}] README written.`);

    if (isDry) {
      console.log(`[${repoName}] Dry run — skipping push & PR.`);
      results.success.push(repoName);
      return;
    }

    // Git: create branch, commit, push
    const git = simpleGit(cloneDir);
    const defaultBranch = await getDefaultBranch(owner, repoName, config.githubToken);

    // Check if branch already exists remotely; delete local if so to avoid conflicts
    const branchList = await git.branchLocal();
    if (branchList.all.includes(AI_BRANCH)) {
      await git.deleteLocalBranch(AI_BRANCH, true);
    }

    await git.checkoutLocalBranch(AI_BRANCH);
    await git.add('README.md');
    await git.commit('docs: add AI-generated README.md [readminator]');

    // Push with credential helper via URL embedding
    const remote = buildAuthenticatedUrl(repo.clone_url, config.githubToken);
    await git.push(remote, AI_BRANCH, ['--force']);
    console.log(`[${repoName}] Pushed branch ${AI_BRANCH}.`);

    // Create Pull Request
    const pr = await createPullRequest(owner, repoName, config.githubToken, {
      title: 'docs: AI-generated README.md',
      body: [
        '## AI-Generated README',
        '',
        'This pull request was automatically created by **readminator**.',
        '',
        'The README was generated by analyzing the repository structure, dependencies, and entry-point files.',
        '',
        '> Please review, edit as needed, and merge if satisfied.',
      ].join('\n'),
      head: AI_BRANCH,
      base: defaultBranch,
    });

    console.log(`[${repoName}] PR created: ${pr.html_url}`);

    // Auto-merge the PR
    if (autoMerge) {
      try {
        await mergePullRequest(owner, repoName, pr.number, config.githubToken);
        console.log(`[${repoName}] PR merged.`);
      } catch (mergeErr) {
        // Merge can fail if branch protection rules block it — log but don't fail the whole run
        console.warn(`[${repoName}] Auto-merge failed (PR left open): ${mergeErr.message}`);
      }
    }

    results.success.push(repoName);
  } catch (err) {
    console.error(`[${repoName}] Error: ${err.message}`);
    results.failed.push({ name: repoName, error: err.message });
  } finally {
    // Clean up cloned directory regardless of outcome
    cleanupDir(cloneDir);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Clone a repo into `destDir`. Re-clone if the directory already exists.
 */
async function cloneRepo(cloneUrl, destDir, token) {
  cleanupDir(destDir);

  const authenticatedUrl = buildAuthenticatedUrl(cloneUrl, token);
  const git = simpleGit();
  await git.clone(authenticatedUrl, destDir, ['--depth', '1']);
}

/**
 * Embed the GitHub token in a clone URL for authentication.
 * Converts https://github.com/... → https://<token>@github.com/...
 */
function buildAuthenticatedUrl(cloneUrl, token) {
  return cloneUrl.replace('https://', `https://${token}@`);
}

/**
 * Remove a directory recursively if it exists.
 */
function cleanupDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}
