import fs from 'fs';
import path from 'path';

// Files that contain high-signal information about a project
const MANIFEST_FILES = [
  'package.json',
  'requirements.txt',
  'Pipfile',
  'pyproject.toml',
  'pom.xml',
  'build.gradle',
  'Cargo.toml',
  'go.mod',
  'composer.json',
  'Gemfile',
  '.csproj',
];

// Entry-point file candidates (ordered by priority)
const ENTRY_CANDIDATES = [
  'index.js',
  'index.ts',
  'main.js',
  'main.ts',
  'app.js',
  'app.ts',
  'server.js',
  'server.ts',
  'src/index.js',
  'src/index.ts',
  'src/main.js',
  'src/main.ts',
  'main.py',
  'app.py',
  'src/main.py',
  'Main.java',
  'src/main/java',
];

/**
 * Analyze a cloned repository directory and return a structured summary
 * suitable for passing to an AI provider.
 * @param {string} repoPath - Absolute path to the cloned repo.
 * @param {string} repoName - Name of the repository.
 * @returns {string} A textual summary for the AI prompt.
 */
export function analyzeRepo(repoPath, repoName) {
  const lines = [];

  lines.push(`Repository: ${repoName}`);
  lines.push('');

  // Top-level folder structure
  const topLevelEntries = safeReadDir(repoPath).filter(
    (e) => !e.startsWith('.')  && e !== 'node_modules' && e !== '__pycache__' && e !== '.git'
  );
  lines.push('Top-level structure:');
  topLevelEntries.forEach((e) => lines.push(`  ${e}`));
  lines.push('');

  // Manifest files
  for (const manifestName of MANIFEST_FILES) {
    const fullPath = path.join(repoPath, manifestName);
    if (fs.existsSync(fullPath)) {
      const content = safeReadFile(fullPath, 3000);
      lines.push(`--- ${manifestName} ---`);
      lines.push(content);
      lines.push('');
    }
  }

  // Entry-point files
  for (const candidate of ENTRY_CANDIDATES) {
    const fullPath = path.join(repoPath, candidate);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      const content = safeReadFile(fullPath, 2000);
      lines.push(`--- ${candidate} (entry point) ---`);
      lines.push(content);
      lines.push('');
      break; // Only include the first matching entry point
    }
  }

  // Existing README snippet (if any) to give the AI context
  const readmePath = findReadme(repoPath);
  if (readmePath) {
    const content = safeReadFile(readmePath, 1000);
    lines.push('--- Existing README (excerpt) ---');
    lines.push(content);
    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeReadDir(dirPath) {
  try {
    return fs.readdirSync(dirPath);
  } catch {
    return [];
  }
}

/**
 * Read a file safely, truncating to `maxChars` characters.
 */
function safeReadFile(filePath, maxChars) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.length > maxChars
      ? content.slice(0, maxChars) + '\n... [truncated]'
      : content;
  } catch {
    return '';
  }
}

/**
 * Find the README file path inside a directory, case-insensitively.
 */
function findReadme(dirPath) {
  const entries = safeReadDir(dirPath);
  const found = entries.find((e) =>
    /^readme(\.(md|txt|rst|adoc))?$/i.test(e)
  );
  return found ? path.join(dirPath, found) : null;
}
