# neu-memory (Python)

Lightweight, model-agnostic memory toolkit inspired by Claude's built-in memory tool. Bring long-term memory to any LLM agent with a tiny Python package.

> 🎯 This is the **Python port** of the original TypeScript [neu-memory](https://github.com/Panda891027/neu-memory) project.

## Why neu-memory?

- **Works with any runtime**: Drop into OpenAI SDK, LangChain, or your own agent loop
- **Fast integration**: Give agents long-term recall in minutes, with zero runtime dependencies
- **Storage agnostic**: Use the same interface across in-memory, filesystem, database, or cloud storage
- **100% open source**: Apache-2.0 licensed

## Quickstart

### Installation

```bash
# Install core package and in-memory storage
pip install neu-memory neu-memory-storage-in-memory

# Or install with filesystem storage
pip install neu-memory neu-memory-storage-filesystem
```

### Basic Usage

```python
import asyncio
from neu_memory import create_memory_tool
from neu_memory_storage_in_memory import InMemoryStorage

async def main():
    # Initialize storage and memory tool
    storage = InMemoryStorage()
    memory_kit = create_memory_tool(storage)

    # Create a memory file
    result = await memory_kit.execute({
        "command": "create",
        "path": "/memories/log.txt",
        "file_text": "First note!",
    })
    print(result)
    # => "File created successfully at /memories/log.txt"

asyncio.run(main())
```

### Integration with OpenAI SDK

```python
import asyncio
from openai import OpenAI
from neu_memory import create_memory_tool
from neu_memory_storage_in_memory import InMemoryStorage

async def main():
    storage = InMemoryStorage()
    memory_kit = create_memory_tool(storage)

    client = OpenAI()

    messages = [
        {"role": "system", "content": memory_kit.system_prompt},
        {"role": "user", "content": "Draft a project update."},
    ]

    tools = [{
        "type": "function",
        "function": {
            "name": memory_kit.name,
            "description": memory_kit.tool_description,
            "parameters": memory_kit.tool_json_schema,
        },
    }]

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        tools=tools,
    )

    # Handle tool calls...

asyncio.run(main())
```

## Available Storage Backends

### In-Memory Storage
```bash
pip install neu-memory-storage-in-memory
```

- Ephemeral storage (data lost when program ends)
- Zero dependencies
- Perfect for testing

```python
from neu_memory_storage_in_memory import InMemoryStorage
storage = InMemoryStorage()
```

### Filesystem Storage
```bash
pip install neu-memory-storage-filesystem
```

- Persistent storage on local filesystem
- Zero dependencies
- Production-ready

```python
from neu_memory_storage_filesystem import FileSystemStorage
storage = await FileSystemStorage.init("./memory")
```

### Custom Storage

Implement your own storage backend by inheriting from the `Storage` interface:

```python
from neu_memory import Storage

class MyCustomStorage(Storage):
    async def read(self, path: str) -> str:
        # Your implementation
        pass

    async def write(self, path: str, content: str) -> None:
        # Your implementation
        pass

    # Implement other methods...
```

## Examples

The [examples](examples/) directory contains runnable examples:

- **`simple_example.py`** - Basic usage without an LLM
- **`openai_example.py`** - Integration with OpenAI SDK

To run examples:

```bash
cd examples

# Run simple example (no API key needed)
python simple_example.py

# Run OpenAI example (requires API key)
cp .env.example .env  # Add your API key
pip install openai python-dotenv
python openai_example.py
```

## How It Works

neu-memory keeps the memory contract small and explicit:

1. **Command schema** — Strongly typed definitions for `view`, `create`, `str_replace`, `insert`, `delete`, `rename` operations
2. **Executor** — Validates `/memories` paths, routes commands, and formats responses
3. **Storage interface** — Plug in any backend by implementing seven filesystem-like methods

## Memory Commands

### view
Inspect directory contents or file contents.
```python
await memory_kit.execute({
    "command": "view",
    "path": "/memories/notes",
})
```

### create
Create or overwrite a file.
```python
await memory_kit.execute({
    "command": "create",
    "path": "/memories/note.txt",
    "file_text": "Content here",
})
```

### str_replace
Replace text in a file.
```python
await memory_kit.execute({
    "command": "str_replace",
    "path": "/memories/note.txt",
    "old_str": "old text",
    "new_str": "new text",
})
```

### insert
Insert text at specific line.
```python
await memory_kit.execute({
    "command": "insert",
    "path": "/memories/note.txt",
    "insert_line": 1,
    "insert_text": "New line",
})
```

### delete
Remove a file or directory.
```python
await memory_kit.execute({
    "command": "delete",
    "path": "/memories/note.txt",
})
```

### rename
Rename or move a file/directory.
```python
await memory_kit.execute({
    "command": "rename",
    "old_path": "/memories/old.txt",
    "new_path": "/memories/new.txt",
})
```

## Development

```bash
# Clone the repository
git clone https://github.com/Panda891027/neu-memory.git
cd neu-memory/python-version

# Install in development mode
pip install -e .

# Install development dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Format code
black .

# Lint
ruff check .
```

## Requirements

- Python 3.8+
- `typing-extensions` (automatically installed)

## Contributing

Please read the [contribution guide](../CONTRIBUTING.md) before opening an issue or pull request.

## License

Apache-2.0. See [LICENSE](../LICENSE) for details.

## Acknowledgments

This is a Python port of the original TypeScript [neu-memory](https://github.com/Panda891027/neu-memory) project, inspired by Claude's built-in memory tool.
