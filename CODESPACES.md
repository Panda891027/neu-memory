# 🚀 Try neu-memory in GitHub Codespaces

Experience neu-memory without any local setup! GitHub Codespaces provides a complete development environment in your browser.

## ⚡ One-Click Launch

Click the button below to launch a fully configured development environment:

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/Panda891027/neu-memory?quickstart=1)

**What you get:**
- ✅ Python 3.11 pre-installed
- ✅ All dependencies ready
- ✅ VS Code in your browser
- ✅ Run examples instantly
- ✅ No configuration needed

## 🎯 What Can You Do?

Once your Codespace launches (~2 minutes), you can:

### 1. Run the Simple Example
```bash
cd python-version
python examples/simple_example.py
```

This demonstrates all core features without needing an API key!

### 2. Try OpenAI Integration
```bash
# Edit examples/.env and add your OPENAI_API_KEY
nano examples/.env

# Run the example
python examples/openai_example.py
```

### 3. Explore the Code
Browse the full source code with syntax highlighting:
- `neu_memory/` - Core implementation
- `neu_memory_storage_*/` - Storage backends
- `examples/` - Working examples

### 4. Develop Your Own Integration
```bash
# Create your own script
touch my_experiment.py

# Edit it in VS Code (in browser)
# Run it
python my_experiment.py
```

## 📊 Usage Limits

GitHub provides **free Codespaces hours** every month:
- Free accounts: **60 hours/month**
- Pro accounts: **90 hours/month**
- Students: **Unlimited** (with GitHub Education)

## 💡 Tips

### Save Your API Key Securely
1. Go to https://github.com/settings/codespaces
2. Add a secret named `OPENAI_API_KEY`
3. It will be automatically available in all your Codespaces

### Resume Your Work
Your Codespace saves automatically:
1. Go to https://github.com/codespaces
2. Find your Codespace
3. Click to resume

### Share Your Work
You can make your Codespace public and share the URL with others!

## 🆘 Need Help?

- **Codespace won't start?** Try refreshing the page
- **Missing dependencies?** Run `pip install -r requirements-dev.txt`
- **Want to start fresh?** Delete and recreate from github.com/codespaces

## 🔗 Learn More

- [Full Codespaces Guide](.devcontainer/README.md)
- [Python Version Documentation](python-version/README.md)
- [Examples Guide](python-version/examples/README.md)

---

**Don't have a GitHub account?** Sign up free at https://github.com/signup
