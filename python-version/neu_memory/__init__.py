"""
neu-memory - Lightweight, model-agnostic memory toolkit for LLM agents.

Bring long-term memory to any LLM agent with a tiny Python package.
"""

from dataclasses import dataclass
from typing import Optional, Dict, Any

from .types import (
    DEFAULT_MEMORY_TOOL_NAME,
    MEMORY_COMMANDS,
    MemoryCommand,
    MemoryCommandName,
    MemoryToolName,
)
from .runtime import (
    Storage,
    StoragePathInfo,
    StorageDirectoryEntry,
    MEMORY_ROOT,
    create_memory_executor,
)
from .prompts import create_system_prompt, create_tool_description
from .schema import create_tool_json_schema

__version__ = "0.1.0"

__all__ = [
    # Main API
    "create_memory_tool",
    "MemoryToolKit",
    # Types
    "MemoryCommand",
    "MemoryCommandName",
    "MemoryToolName",
    "Storage",
    "StoragePathInfo",
    "StorageDirectoryEntry",
    # Constants
    "DEFAULT_MEMORY_TOOL_NAME",
    "MEMORY_COMMANDS",
    "MEMORY_ROOT",
    # Utilities
    "create_memory_executor",
    "create_system_prompt",
    "create_tool_description",
    "create_tool_json_schema",
]


@dataclass(frozen=True)
class MemoryToolKit:
    """Memory tool kit for LLM agents."""

    name: MemoryToolName
    system_prompt: str
    tool_description: str
    tool_json_schema: Dict[str, Any]
    execute: Any  # MemoryExecutor type


def create_memory_tool(
    storage: Storage,
    tool_name: Optional[MemoryToolName] = None,
) -> MemoryToolKit:
    """
    Create a memory tool kit for LLM agents.

    Args:
        storage: Storage backend implementation
        tool_name: Optional tool name (defaults to "memory")

    Returns:
        MemoryToolKit instance with prompt, schema, and executor

    Example:
        >>> from neu_memory import create_memory_tool
        >>> from neu_memory_storage_in_memory import InMemoryStorage
        >>> storage = InMemoryStorage()
        >>> memory_kit = create_memory_tool(storage)
        >>> result = await memory_kit.execute({
        ...     "command": "create",
        ...     "path": "/memories/note.txt",
        ...     "file_text": "Hello world!"
        ... })
    """
    name = tool_name or DEFAULT_MEMORY_TOOL_NAME
    system_prompt = create_system_prompt(name)
    tool_description = create_tool_description(name)
    executor = create_memory_executor(storage)

    return MemoryToolKit(
        name=name,
        system_prompt=system_prompt,
        tool_description=tool_description,
        tool_json_schema=create_tool_json_schema(),
        execute=executor,
    )
