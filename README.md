# tasku — AI-Powered CLI Task Manager

Manage tasks using natural language. Type what you need and tasku handles the rest.

## Demo

```bash
# Add a task naturally
tasku add "review PR by Friday high priority"

# Add multiple tasks at once
tasku add "fix login bug on saturday and deploy to production with label deploy"

# List tasks
tasku list

# Filter by status
tasku list --status pending
tasku list --label work

# See what's due today
tasku today
```

## How It Works

tasku uses Google Gemini to parse natural language into structured tasks. When AI isn't available, it falls back to a rule-based parser. Tasks are stored locally in a config file (no database, no cloud).

## Features

- Natural language task creation
- AI-powered parsing (Gemini) with offline fallback
- Priority detection (high/medium/low)
- Label/tag support
- Due date parsing (today, tomorrow, Friday, etc.)
- Filtering and status tracking
- Zero external dependencies for storage

## Setup

```bash
git clone https://github.com/makhembu/tasku
cd tasku
npm install
npm run build
npm link   # makes `tasku` available globally

# Optional — add Gemini API key for AI parsing
cp .env.example .env
# edit .env with your key from https://aistudio.google.com/apikey
```

## Commands

| Command | Description |
|---------|-------------|
| `tasku add <text>` | Add task(s) from natural language |
| `tasku list` | List all tasks |
| `tasku list --status pending` | Filter by status |
| `tasku list --label work` | Filter by label |
| `tasku today` | Show tasks due today |
| `tasku done <id>` | Mark task complete |
| `tasku delete <id>` | Delete a task |

## Stack

- TypeScript
- Google Gemini API
- Commander.js (CLI framework)
- conf (local JSON storage)
- chalk (terminal styling)

## Why

Existing task CLIs (Taskwarrior, Todoist CLI) require rigid syntax. tasku lets you type naturally — the way you actually think about tasks.
