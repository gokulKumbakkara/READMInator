# READMInator

An AI-powered CLI tool and MCP server that automatically generates high-quality `README.md` files for your GitHub repositories, then opens a Pull Request — never touching `main` directly.

Supports **Groq**, **OpenAI**, and **Anthropic** as AI providers. Works both as a standalone CLI and as an MCP server that any MCP-compatible client (Claude Desktop, Claude Code) can call.

---

## Features

- **Multi-provider AI** — Groq (Llama 3.3), OpenAI (GPT-4o), or Anthropic (Claude Opus)
- **Smart filtering** — skips forks, archived repos, and repos that already have a solid README (> 100 lines)
- **Branch-safe** — always pushes to `ai/readme-update` and opens a PR; never touches `main`
- **Optional auto-merge** — pass `--merge` to merge the PR right after creation
- **Dry run** — preview generated READMEs locally without pushing anything
- **Concurrency** — process multiple repos in parallel (configurable)
- **Repo filtering** — scope a run to a specific language or name pattern
- **MCP server** — exposes all capabilities as MCP tools for use with Claude Desktop / Claude Code
- **Extensible** — adding a new AI provider requires one new file

---

## Tech Stack

- **Node.js** >= 18 (ESM)
- **commander** — CLI framework
- **inquirer** — interactive setup prompts
- **axios** — GitHub REST API
- **simple-git** — git operations
- **p-limit** — concurrency control
- **zod** — schema validation (MCP layer)
- **@modelcontextprotocol/sdk** — MCP server
- **groq-sdk** / **openai** / **@anthropic-ai/sdk** — AI providers

---

## Installation

```bash
git clone https://github.com/gokulKumbakkara/READMInator.git
cd READMInator
npm install
npm link          # makes `readminator` and `readminator-mcp` available globally
```

> Requires Node.js 18+. If `npm link` fails with a permissions error, run:
> ```bash
> mkdir -p ~/.npm-global
> npm config set prefix '~/.npm-global'
> echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
> npm link
> ```

---

## CLI Usage

### 1. Configure credentials

```bash
readminator setup
```

Prompts for:

| Field | Description |
|---|---|
| AI Provider | `groq`, `openai`, or `anthropic` |
| API Key | Your provider's secret key |
| Model | Leave blank to use the provider default |
| GitHub Token | PAT with `repo` + `pull_request` scope |
| GitHub Username | Your GitHub handle |

Config is saved to `~/.readminator/config.json`.

---

### 2. Run

```bash
# Generate READMEs, push branch, open PR (no auto-merge)
readminator run

# Same but also merge each PR immediately
readminator run --merge

# Dry run — generate locally, skip push & PR
readminator run --dry

# Filter by language
readminator run --language typescript

# Filter by repo name substring
readminator run --filter api

# Control concurrency (default: 3)
readminator run --concurrency 5
```

---

## MCP Server Usage

READMInator ships a second binary — `readminator-mcp` — that speaks the Model Context Protocol over stdio. This lets Claude (or any MCP client) call READMInator's tools directly in a conversation.

### Add to Claude Desktop

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "readminator": {
      "command": "readminator-mcp"
    }
  }
}
```

### Add to Claude Code

```bash
claude mcp add readminator readminator-mcp
```

### Available MCP Tools

| Tool | Description |
|---|---|
| `readminator_setup` | Save AI provider credentials and GitHub token |
| `readminator_list_repos` | List repositories eligible for README generation |
| `readminator_preview_readme` | Generate a README for one repo and return the content (no push) |
| `readminator_run_repo` | Full pipeline for a single repo — push branch + open PR |
| `readminator_run_all` | Full pipeline for all eligible repos |

All tools accept optional `language`, `nameFilter`, `merge`, and `concurrency` parameters where relevant.

---

## Folder Structure

```
READMInator/
├── index.js                     # CLI entry point (readminator binary)
├── mcp-server.js                # MCP server entry point (readminator-mcp binary)
├── package.json
├── src/
│   ├── cli/
│   │   ├── setup.js             # `setup` command — interactive config wizard
│   │   └── run.js               # `run` command — thin wrapper over pipeline
│   ├── providers/
│   │   ├── baseProvider.js      # Abstract base class + shared prompt builder
│   │   ├── groqProvider.js      # Groq (Llama 3.3) implementation
│   │   ├── openaiProvider.js    # OpenAI (GPT-4o) implementation
│   │   ├── anthropicProvider.js # Anthropic (Claude Opus) implementation
│   │   └── providerFactory.js  # Dynamic provider selection
│   ├── services/
│   │   ├── pipeline.js          # Core pipeline — shared by CLI and MCP server
│   │   ├── githubService.js     # GitHub REST API (repos, PRs, merges)
│   │   ├── repoAnalyzer.js      # Extracts structure/deps from a cloned repo
│   │   └── readmeGenerator.js  # Calls AI provider, strips code fences
│   └── utils/
│       └── configManager.js    # Read/write ~/.readminator/config.json
└── README.md
```

---

## Adding a New AI Provider

1. Create `src/providers/myProvider.js`:

```js
import { BaseProvider } from './baseProvider.js';

export class MyProvider extends BaseProvider {
  async generateReadme(summary) {
    // call your API using this.buildPrompt(summary)
    return markdownString;
  }
}
```

2. Register it in `src/providers/providerFactory.js`:

```js
case 'myprovider':
  return new MyProvider(apiKey, model);
```

No other changes needed.

---

## Safety

- Never pushes directly to `main` / `master`
- Repos with README > 100 lines are skipped
- Forks and archived repos are excluded
- Per-repo errors are caught and logged; the rest of the batch continues
- Config file stores credentials locally at `~/.readminator/config.json` — never committed

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Open a Pull Request

---

## License

MIT
