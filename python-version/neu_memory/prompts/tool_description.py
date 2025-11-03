"""Tool description generation for memory tool."""

from ..types.commands import DEFAULT_MEMORY_TOOL_NAME, MemoryToolName
from typing import Optional


def create_tool_description(tool_name: Optional[MemoryToolName] = None) -> str:
    """
    Create tool description explaining memory commands.

    Args:
        tool_name: Name of the memory tool (defaults to "memory")

    Returns:
        Tool description string
    """
    name = tool_name or DEFAULT_MEMORY_TOOL_NAME
    return f"""Use the `{name}` tool to manage the `/memories` directory. Choose the command that best fits your intent and supply the required arguments precisely as described.

### view
Inspect directory contents or file contents, optionally within a specific line range.
- command: `view`
- path: Absolute path within `/memories`, either a directory or file.
- view_range: Optional `[startLine, endLine]` tuple (1-indexed) used to slice large files.

### create
Create or overwrite a file with new text content.
- command: `create`
- path: Destination file path under `/memories`.
- file_text: Full text to write into the file.
Notes: Treat `create` as destructive for existing files—Claude overwrites prior content.

### str_replace
Replace a substring in an existing file.
- command: `str_replace`
- path: Target file path.
- old_str: Exact text to replace.
- new_str: Replacement text.
Notes: Prefer `str_replace` for small text edits without rewriting the whole file.

### insert
Insert text at a specific line number.
- command: `insert`
- path: Target file path.
- insert_line: Line number (1-indexed) where the insertion begins.
- insert_text: Text to insert at the specified line.

### delete
Remove a file or directory inside `/memories`.
- command: `delete`
- path: Path to remove.
Notes: Clients should enforce path whitelisting to avoid deleting outside `/memories`.

### rename
Rename or move a file/directory within `/memories`.
- command: `rename`
- old_path: Current absolute path.
- new_path: Desired absolute path."""
