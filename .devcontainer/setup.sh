#!/bin/bash

echo "🚀 Setting up neu-memory development environment..."

# Navigate to python-version directory
cd python-version

# Install core dependencies
echo "📦 Installing dependencies..."
pip install -q typing-extensions

# Install development dependencies
echo "🔧 Installing development tools..."
pip install -q pytest pytest-asyncio black mypy ruff

# Install example dependencies
echo "📚 Installing example dependencies..."
pip install -q openai python-dotenv

# Create .env file for examples if it doesn't exist
if [ ! -f examples/.env ]; then
    echo "📝 Creating examples/.env template..."
    cp examples/.env.example examples/.env
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🎉 Welcome to neu-memory Python Development!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📂 Project Structure:"
echo "   • python-version/neu_memory/           - Core package"
echo "   • python-version/neu_memory_storage_*/ - Storage backends"
echo "   • python-version/examples/             - Usage examples"
echo ""
echo "🚀 Quick Start:"
echo "   cd python-version"
echo "   python examples/simple_example.py      # Run basic demo (no API key)"
echo ""
echo "   # For OpenAI example:"
echo "   # 1. Edit examples/.env and add your OPENAI_API_KEY"
echo "   # 2. python examples/openai_example.py"
echo ""
echo "📖 Documentation:"
echo "   cat python-version/README.md           # Full documentation"
echo "   cat python-version/examples/README.md  # Examples guide"
echo ""
echo "🛠️  Development:"
echo "   pytest                                 # Run tests (when available)"
echo "   black .                                # Format code"
echo "   ruff check .                           # Lint code"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
