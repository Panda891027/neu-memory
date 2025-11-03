"""System prompt generation for memory tool."""

from ..types.commands import DEFAULT_MEMORY_TOOL_NAME, MemoryToolName
from typing import Optional


def create_system_prompt(tool_name: Optional[MemoryToolName] = None) -> str:
    """
    Create system prompt instructing the model to use memory.

    Args:
        tool_name: Name of the memory tool (defaults to "memory")

    Returns:
        System prompt string
    """
    name = tool_name or DEFAULT_MEMORY_TOOL_NAME
    return f"""IMPORTANT: ALWAYS VIEW YOUR MEMORY DIRECTORY BEFORE DOING ANYTHING ELSE.
MEMORY PROTOCOL:
1. Use the `view` command of your `{name}` tool to check for earlier progress.
2. ... (work on the task) ...
     - As you make progress, record status / progress / thoughts etc in your memory.
ASSUME INTERRUPTION: Your context window might be reset at any moment, so you risk losing any progress that is not recorded in your memory directory."""
