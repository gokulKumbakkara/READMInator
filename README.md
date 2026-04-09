# READMInator

A production-ready Node.js CLI tool that automatically generates high-quality `README.md` files for your GitHub repositories using AI (Groq, OpenAI, or Anthropic), then opens a Pull Request — never touching `main` directly.

---

## Features

- **Multi-provider AI**: Switch between Groq (Llama 3.3), OpenAI (GPT-4o), or Anthropic (Claude) with a single config option.
- **Smart repo filtering**: Skips forks, archived repos, and repos that already have a good README (> 100 lines).
- **Safe by design**: Always creates branch `ai/readme-update` and opens a Pull Request — never force-pushes to `main`.
- **Optional auto-merge**: Pass `--merge` to merge the PR immediately after creation.
- **Dry run mode**: Preview generated READMEs locally without pushing anything.
- **Concurrency**: Processes multiple repos in parallel (configurable limit).
- **Filtering**: Scope runs to a specific language or repo name pattern.
- **Extensible**: Adding a new AI provider requires only one new file.

---

## Tech Stack

- **Node.js** >= 18 (ESM)
- **commander** — CLI framework
- **inquirer** — interactive prompts
- **axios** — GitHub REST API calls
- **simple-git** — git operations
- **p-limit** — concurrency control
- **groq-sdk** / **openai** / **@anthropic-ai/sdk** — AI provider SDKs

---

## Installation

```bash
# Clone the repository
git clone https://github.com/gokulKumbakkara/READMInator.git
cd READMInator

# Install dependencies
npm install

# Make the CLI executable globally
npm link
```

---

## Usage

### 1. Configure credentials

```bash
readminator setup
```

You will be prompted for:

| Field | Description |
|---|---|
| AI Provider | `groq`, `openai`, or `anthropic` |
| API Key | Your provider's secret key |
| Model | Leave blank to use the default for that provider |
| GitHub Token | PAT with `repo` + `pull_requests` scope |
| GitHub Username | Your GitHub handle |

Config is saved to `~/.readminator/config.json`.

---

### 2. Generate READMEs

```bash
# Push branch + create PR (open, no merge)
readminator run

# Push branch + create PR + auto-merge
readminator run --merge

# Dry run — generate locally, skip push & PR
readminator run --dry

# Filter by language
readminator run --language typescript

# Filter by repo name substring
readminator run --filter api

# Set concurrency (default: 3)
readminator run --concurrency 5
```

---

## Folder Structure

```
READMInator/
├── index.js                  # CLI entry point
├── package.json
├── src/
│   ├── cli/
│   │   ├── setup.js          # `setup` command — interactive config wizard
│   │   └── run.js            # `run` command — main pipeline orchestration
│   ├── providers/
│   │   ├── baseProvider.js   # Abstract base class + shared prompt builder
│   │   ├── groqProvider.js   # Groq (Llama 3.3) implementation
│   │   ├── openaiProvider.js # OpenAI (GPT-4o) implementation
│   │   ├── anthropicProvider.js # Anthropic (Claude) implementation
│   │   └── providerFactory.js   # Dynamic provider selection
│   ├── services/
│   │   ├── githubService.js  # GitHub REST API (fetch repos, create/merge PRs)
│   │   ├── repoAnalyzer.js   # Extracts structured summary from a cloned repo
│   │   └── readmeGenerator.js # Calls provider and cleans up output
│   └── utils/
│       └── configManager.js  # Read/write ~/.readminator/config.json
└── README.md
```

---

## Example Config File

`~/.readminator/config.json`

```json
{
  "provider": "groq",
  "apiKey": "gsk_...",
  "model": "llama-3.3-70b-versatile",
  "githubToken": "ghp_...",
  "githubUsername": "your-username"
}
```

---

## Adding a New Provider

1. Create `src/providers/myProvider.js` extending `BaseProvider`:

```js
import { BaseProvider } from './baseProvider.js';

export class MyProvider extends BaseProvider {
  async generateReadme(summary) {
    // call your API
    return markdownString;
  }
}
```

2. Register it in `src/providers/providerFactory.js`:

```js
case 'myprovider':
  return new MyProvider(apiKey, model);
```

That's it — no other changes required.

---

## Safety

- Never pushes directly to `main` / `master`.
- Repos with README > 100 lines are skipped automatically.
- Archived and forked repos are excluded.
- Rate limit errors and network failures are caught and logged per repo; the rest of the batch continues.

---

## Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/my-feature`).
3. Commit your changes.
4. Open a Pull Request.

---

## License

MIT
