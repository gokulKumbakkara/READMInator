import { loadConfig } from '../utils/configManager.js';
import { getProvider } from '../providers/providerFactory.js';
import { getEligibleRepos, processSingleRepo, processAllRepos } from '../services/pipeline.js';

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

  console.log('Fetching and filtering repositories...');
  const { success, failed } = await processAllRepos(config, provider, filters, {
    dry: isDry,
    autoMerge,
    concurrency,
  });

  console.log('\n--- Summary ---');
  console.log(`Success : ${success.length}`);
  console.log(`Failed  : ${failed.length}`);

  if (failed.length > 0) {
    console.log('\nFailed repos:');
    failed.forEach(({ repoName, error }) => console.log(`  ${repoName}: ${error}`));
  }
}
