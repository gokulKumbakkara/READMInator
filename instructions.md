You are a senior staff-level engineer.

Build a production-ready Node.js CLI tool called **auto-readme-ai**.

---

# 🎯 Goal

A CLI tool that:

* Takes a GitHub username
* Fetches all repositories
* Generates high-quality README.md using an AI provider (Groq, OpenAI, or Anthropic)
* Commits changes via branch + Pull Request (NOT direct push)

---

# 🧠 Core Features

## 1. CLI Commands (use commander)

### `auto-readme-ai setup`

* Prompt user for:

  * AI Provider (groq / openai / anthropic)
  * API Key
  * Model (optional, provide defaults)
  * GitHub Token
  * GitHub Username
* Store config at:

  * `~/.auto-readme-ai/config.json`

---

### `auto-readme-ai run`

* Fetch all repos for the user
* Skip:

  * forked repos
  * archived repos
  * repos with good README (heuristic: > 100 lines)

For each repo:

* Clone repo
* Analyze codebase
* Generate README using selected AI provider
* Create branch: `ai/readme-update`
* Commit README.md
* Push branch
* Create Pull Request via GitHub API

---

### `auto-readme-ai run --dry`

* Perform everything except git push and PR creation

---

# ⚙️ Tech Stack

* Node.js (ESM)
* commander (CLI)
* axios (GitHub API)
* simple-git (git ops)
* inquirer (prompts)

### AI SDKs:

* groq-sdk
* openai
* @anthropic-ai/sdk

---

# 🧩 Architecture (IMPORTANT)

Follow clean architecture with provider abstraction:

/src
/cli
/services
githubService.js
repoAnalyzer.js
readmeGenerator.js
/providers
baseProvider.js
groqProvider.js
openaiProvider.js
anthropicProvider.js
providerFactory.js
/utils
configManager.js
index.js

---

# 🤖 AI Provider Layer

## Base Interface

Create a base class:

```js
class BaseProvider {
  async generateReadme(summary) {
    throw new Error("Not implemented");
  }
}
```

---

## Implement Providers

### Groq

* Use model: `llama3-70b-8192`

### OpenAI

* Use model: `gpt-5.3` (or latest available)

### Anthropic

* Use model: `claude-3-opus-20240229` (or latest)

---

## Provider Factory

Select provider dynamically based on config:

```js
getProvider(config)
```

---

# 🧠 README Generation Prompt

Use a strong prompt:

"Act as a senior software engineer.
Analyze the given repository summary and generate a high-quality README.md.

Include:

* Project Title
* Description
* Features (specific, not generic)
* Tech Stack
* Installation
* Usage
* Folder Structure
* Contributing

Avoid generic statements. Make it specific to the repo."

---

# 🔍 Repo Analyzer

Extract:

* package.json / requirements.txt / pom.xml
* dependencies
* scripts
* top-level folder structure
* main entry files

Limit token usage intelligently.

---

# 📦 GitHub Integration

Use GitHub REST API:

* Fetch repos:
  GET /users/{username}/repos

* Create PR:
  POST /repos/{owner}/{repo}/pulls

Use authentication via token.

---

# 🛡️ Safety Features

* NEVER push to main directly
* Always use branch: `ai/readme-update`
* Skip repos with good README
* Handle errors gracefully
* Add logging
* Handle rate limits

---

# ⚡ Advanced Features

* Concurrency (process multiple repos in parallel with limit)
* Retry failed repos
* Filtering:

  * language
  * repo name
* Extensible provider system (future support for local models)

---

# 🧪 Output Requirements

Generate:

1. Full working code (all files)
2. package.json
3. CLI usage instructions
4. Example config file
5. README for this CLI tool

---

# 🧠 Code Quality

* Clean modular structure
* Async/await everywhere
* Proper error handling
* No pseudo code — everything runnable
* Add helpful comments

---

# 🚀 Future-ready Design

Ensure the design allows:

* Adding new providers easily
* Publishing to npm
* Plug-and-play configuration

---

Now generate the complete implementation.
