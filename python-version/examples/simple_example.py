"""
Simple example demonstrating basic neu-memory functionality.

This example shows direct usage without an LLM, useful for testing and understanding.
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path for local development
sys.path.insert(0, str(Path(__file__).parent.parent))

from neu_memory import create_memory_tool
from neu_memory_storage_in_memory import InMemoryStorage


async def main():
    """Run simple example with in-memory storage."""
    print("=== neu-memory Simple Example ===\n")

    # Initialize storage and memory tool
    storage = InMemoryStorage()
    memory_kit = create_memory_tool(storage)

    print(f"Tool name: {memory_kit.name}")
    print(f"System prompt: {memory_kit.system_prompt[:100]}...\n")

    # Create a file
    print("Creating /memories/notes/meeting.txt...")
    result = await memory_kit.execute({
        "command": "create",
        "path": "/memories/notes/meeting.txt",
        "file_text": "Meeting Notes\n=============\n- Discussed Q1 roadmap\n- Team alignment on priorities",
    })
    print(f"Result: {result}\n")

    # View the file
    print("Viewing /memories/notes/meeting.txt...")
    result = await memory_kit.execute({
        "command": "view",
        "path": "/memories/notes/meeting.txt",
    })
    print(f"Content:\n{result}\n")

    # Edit the file using str_replace
    print("Adding action items to meeting notes...")
    result = await memory_kit.execute({
        "command": "str_replace",
        "path": "/memories/notes/meeting.txt",
        "old_str": "- Team alignment on priorities",
        "new_str": "- Team alignment on priorities\n- Action: Draft technical spec by Friday",
    })
    print(f"Result: {result}\n")

    # View updated content
    print("Viewing updated content...")
    result = await memory_kit.execute({
        "command": "view",
        "path": "/memories/notes/meeting.txt",
    })
    print(f"Content:\n{result}\n")

    # Insert text at specific line
    print("Inserting date at the top...")
    result = await memory_kit.execute({
        "command": "insert",
        "path": "/memories/notes/meeting.txt",
        "insert_line": 1,
        "insert_text": "Date: 2025-01-15",
    })
    print(f"Result: {result}\n")

    # View directory
    print("Viewing /memories directory...")
    result = await memory_kit.execute({
        "command": "view",
        "path": "/memories",
    })
    print(f"Directory contents:\n{result}\n")

    # Rename file
    print("Renaming file...")
    result = await memory_kit.execute({
        "command": "rename",
        "old_path": "/memories/notes/meeting.txt",
        "new_path": "/memories/notes/meeting-2025-01-15.txt",
    })
    print(f"Result: {result}\n")

    # List directory contents
    print("Viewing /memories/notes directory...")
    result = await memory_kit.execute({
        "command": "view",
        "path": "/memories/notes",
    })
    print(f"Directory contents:\n{result}\n")

    print("=== Example Complete ===")
    print("Note: This used InMemoryStorage, so data is ephemeral.")
    print("Use FileSystemStorage for persistent storage!")


if __name__ == "__main__":
    asyncio.run(main())
