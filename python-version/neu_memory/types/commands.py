"""
Type definitions mirroring Claude's memory tool command contract.
https://docs.claude.com/en/docs/agents-and-tools/tool-use/memory-tool
"""

from typing import Literal, Union, TypedDict, Optional, Tuple
from typing_extensions import NotRequired

DEFAULT_MEMORY_TOOL_NAME = "memory"

MemoryToolName = str

MEMORY_COMMANDS = ("view", "create", "str_replace", "insert", "delete", "rename")

MemoryCommandName = Literal["view", "create", "str_replace", "insert", "delete", "rename"]

LineRange = Tuple[int, int]


class ViewCommand(TypedDict):
    """Inspect directory contents or file contents."""
    command: Literal["view"]
    path: str
    view_range: NotRequired[LineRange]


class CreateCommand(TypedDict):
    """Create or overwrite a file with new text content."""
    command: Literal["create"]
    path: str
    file_text: str


class StrReplaceCommand(TypedDict):
    """Replace a substring in an existing file."""
    command: Literal["str_replace"]
    path: str
    old_str: str
    new_str: str


class InsertCommand(TypedDict):
    """Insert text at a specific line number."""
    command: Literal["insert"]
    path: str
    insert_line: int
    insert_text: str


class DeleteCommand(TypedDict):
    """Remove a file or directory inside /memories."""
    command: Literal["delete"]
    path: str


class RenameCommand(TypedDict):
    """Rename or move a file/directory within /memories."""
    command: Literal["rename"]
    old_path: str
    new_path: str


MemoryCommand = Union[
    ViewCommand,
    CreateCommand,
    StrReplaceCommand,
    InsertCommand,
    DeleteCommand,
    RenameCommand,
]


def is_memory_command_name(value: Optional[str]) -> bool:
    """Check if a value is a valid memory command name."""
    return value in MEMORY_COMMANDS if value else False
