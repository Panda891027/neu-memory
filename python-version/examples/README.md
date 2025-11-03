# neu-memory Examples

This directory contains examples demonstrating how to use neu-memory with different AI SDKs.

## Available Examples

### 1. Simple Example (`simple_example.py`)

A standalone example showing basic neu-memory operations without an LLM.

**Features:**
- Create, view, edit, rename, and delete operations
- Uses InMemoryStorage (ephemeral)
- No API key required

**Run:**
```bash
python simple_example.py
```

### 2. OpenAI SDK Example (`openai_example.py`)

Complete example using OpenAI SDK with filesystem storage.

**Features:**
- Full tool calling integration
- Uses FileSystemStorage (persistent)
- Multi-turn conversation handling

**Requirements:**
```bash
pip install openai python-dotenv
```

**Setup:**
```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

**Run:**
```bash
python openai_example.py
```

## Environment Variables

See `.env.example` for configuration options:
- `OPENAI_API_KEY` - Your OpenAI API key (required for OpenAI example)
- `OPENAI_BASE_URL` - Custom API base URL (optional)
- `MODEL` - Model name to use (default: gpt-4o-mini)

## Storage Backends

### InMemoryStorage
- Ephemeral storage (data lost when program ends)
- Zero dependencies
- Perfect for testing

### FileSystemStorage
- Persistent storage on local filesystem
- Data survives program restarts
- Good for development and production use

## Next Steps

1. Start with `simple_example.py` to understand the basics
2. Move to `openai_example.py` for LLM integration
3. Adapt the examples for your specific use case
4. Implement custom storage backends if needed
