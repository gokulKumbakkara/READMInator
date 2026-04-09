import axios from 'axios';

const GITHUB_API = 'https://api.github.com';

/**
 * Build Axios headers with GitHub token auth.
 * @param {string} token
 */
function headers(token) {
  return {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'readminator',
  };
}

/**
 * Fetch all public (and optionally private) repositories for a user.
 * Handles pagination automatically.
 * @param {string} username
 * @param {string} token
 * @returns {Promise<object[]>}
 */
export async function fetchAllRepos(username, token) {
  const repos = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data } = await axios.get(`${GITHUB_API}/user/repos`, {
      headers: headers(token),
      params: {
        affiliation: 'owner',
        per_page: perPage,
        page,
        sort: 'updated',
      },
    });

    repos.push(...data);

    if (data.length < perPage) break;
    page++;
  }

  return repos;
}

/**
 * Filter repositories: skip forks, archived repos, and those with a good README (> 100 lines).
 * @param {object[]} repos - Raw GitHub repo objects.
 * @param {string} token
 * @param {object} [filters={}]
 * @param {string} [filters.language] - Only include repos with this primary language.
 * @param {string} [filters.nameFilter] - Only include repos whose name contains this string.
 * @returns {Promise<object[]>}
 */
export async function filterRepos(repos, token, filters = {}) {
  const candidates = repos.filter((repo) => {
    if (repo.fork) return false;
    if (repo.archived) return false;
    if (filters.language && repo.language?.toLowerCase() !== filters.language.toLowerCase()) return false;
    if (filters.nameFilter && !repo.name.toLowerCase().includes(filters.nameFilter.toLowerCase())) return false;
    return true;
  });

  // Check README line count in parallel (best-effort)
  const results = await Promise.allSettled(
    candidates.map(async (repo) => {
      const lineCount = await getReadmeLineCount(repo.owner.login, repo.name, token);
      return { repo, lineCount };
    })
  );

  return results
    .filter(
      (r) => r.status === 'fulfilled' && r.value.lineCount <= 100
    )
    .map((r) => r.value.repo);
}

/**
 * Get the number of lines in the default README for a repo.
 * Returns 0 if no README exists.
 * @param {string} owner
 * @param {string} repo
 * @param {string} token
 * @returns {Promise<number>}
 */
async function getReadmeLineCount(owner, repo, token) {
  try {
    const { data } = await axios.get(
      `${GITHUB_API}/repos/${owner}/${repo}/readme`,
      {
        headers: {
          ...headers(token),
          Accept: 'application/vnd.github.v3.raw',
        },
      }
    );
    return data.split('\n').length;
  } catch {
    // 404 = no README at all — eligible
    return 0;
  }
}

/**
 * Create a Pull Request on GitHub.
 * @param {string} owner
 * @param {string} repo
 * @param {string} token
 * @param {object} prData
 * @param {string} prData.title
 * @param {string} prData.body
 * @param {string} prData.head - Branch name
 * @param {string} prData.base - Target branch (usually 'main' or 'master')
 * @returns {Promise<object>} Created PR object
 */
export async function createPullRequest(owner, repo, token, { title, body, head, base }) {
  const { data } = await axios.post(
    `${GITHUB_API}/repos/${owner}/${repo}/pulls`,
    { title, body, head, base },
    { headers: headers(token) }
  );
  return data;
}

/**
 * Get the default branch for a repository.
 * @param {string} owner
 * @param {string} repo
 * @param {string} token
 * @returns {Promise<string>}
 */
export async function getDefaultBranch(owner, repo, token) {
  const { data } = await axios.get(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: headers(token),
  });
  return data.default_branch ?? 'main';
}

/**
 * Merge a Pull Request.
 * @param {string} owner
 * @param {string} repo
 * @param {number} pullNumber
 * @param {string} token
 * @param {'merge'|'squash'|'rebase'} [mergeMethod='squash']
 * @returns {Promise<object>}
 */
export async function mergePullRequest(owner, repo, pullNumber, token, mergeMethod = 'squash') {
  const { data } = await axios.put(
    `${GITHUB_API}/repos/${owner}/${repo}/pulls/${pullNumber}/merge`,
    {
      merge_method: mergeMethod,
      commit_title: 'docs: AI-generated README.md [readminator]',
    },
    { headers: headers(token) }
  );
  return data;
}
