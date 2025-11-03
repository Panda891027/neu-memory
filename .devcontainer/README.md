# GitHub Codespaces Configuration

This directory contains the configuration for running neu-memory in GitHub Codespaces.

## What is GitHub Codespaces?

GitHub Codespaces provides a complete, cloud-based development environment directly in your browser. No local setup required!

## Quick Start

### Method 1: One-Click Launch (Easiest)

Click this button to launch Codespaces instantly:

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/Panda891027/neu-memory)

### Method 2: From Repository

1. Go to https://github.com/Panda891027/neu-memory
2. Click the green **Code** button
3. Select **Codespaces** tab
4. Click **Create codespace on main** (or your branch)

### Method 3: From GitHub.dev

1. Press `.` (period) while viewing the repository on GitHub
2. Click **Continue Working in Codespaces** when prompted

## What's Included

The Codespace automatically sets up:

✅ **Python 3.11** - Latest stable Python
✅ **VS Code Extensions**:
   - Python language support
   - Black code formatter
   - Ruff linter
   - Better TOML support

✅ **All Dependencies**:
   - Core package dependencies
   - Development tools (pytest, black, ruff, mypy)
   - Example dependencies (openai, python-dotenv)

✅ **Pre-configured**:
   - Format on save enabled
   - Python linting configured
   - Example .env template created

## Usage

Once your Codespace starts (takes ~2-3 minutes first time):

```bash
# Navigate to Python version
cd python-version

# Run the simple example (no API key needed)
python examples/simple_example.py

# For OpenAI example:
# 1. Edit examples/.env and add your OPENAI_API_KEY
# 2. Run:
python examples/openai_example.py
```

## Development

```bash
# Install in editable mode
pip install -e .

# Run tests (when available)
pytest

# Format code
black .

# Lint code
ruff check .

# Type checking
mypy neu_memory
```

## Features

### Terminal Access
Full bash terminal with all Python tools

### File Explorer
Browse and edit files directly in VS Code

### Extensions
Pre-installed Python development extensions

### Port Forwarding
Automatically forwards any ports your app uses

### Git Integration
Full git support - commit and push directly from Codespace

## Free Usage

GitHub provides generous free usage:
- **60 hours/month** for free accounts
- **90 hours/month** for Pro accounts
- Unlimited for GitHub Education students

## Tips

1. **Pause, Don't Delete**: Codespaces auto-pause after 30 minutes of inactivity
2. **Resume Later**: Your work is saved - resume anytime from github.com/codespaces
3. **Multiple Codespaces**: You can run multiple Codespaces simultaneously
4. **Secrets**: Add API keys as Codespace secrets for automatic injection

## Troubleshooting

### Slow First Start
- First launch takes 2-3 minutes to build
- Subsequent starts are much faster (~30 seconds)

### Missing Dependencies
```bash
cd python-version
pip install -r requirements-dev.txt
```

### Reset Environment
Delete and recreate the Codespace from github.com/codespaces

## Learn More

- [Codespaces Documentation](https://docs.github.com/en/codespaces)
- [Codespace Lifecycle](https://docs.github.com/en/codespaces/developing-in-codespaces/codespaces-lifecycle)
- [Managing Secrets](https://docs.github.com/en/codespaces/managing-your-codespaces/managing-encrypted-secrets-for-your-codespaces)
