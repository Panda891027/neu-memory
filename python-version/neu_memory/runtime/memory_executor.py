"""Memory command executor."""

from typing import Optional, Protocol, List
from ..types.commands import MemoryCommand, LineRange
from .storage import Storage

MEMORY_ROOT = "/memories"


def strip_trailing_slash(path: str) -> str:
    """Remove trailing slashes from path."""
    if path == MEMORY_ROOT:
        return path
    return path.rstrip("/") or MEMORY_ROOT


def assert_memory_path(path: str) -> str:
    """Validate that path starts with MEMORY_ROOT."""
    if not path.startswith(MEMORY_ROOT):
        raise ValueError(f"Path must start with {MEMORY_ROOT}, got: {path}")
    return strip_trailing_slash(path)


def get_parent_directory(path: str) -> Optional[str]:
    """Get the parent directory of a path."""
    normalized = strip_trailing_slash(path)
    if normalized == MEMORY_ROOT:
        return None
    last_slash = normalized.rfind("/")
    if last_slash <= 0:
        return MEMORY_ROOT
    return normalized[:last_slash] or MEMORY_ROOT


async def format_directory_listing(storage: Storage, path: str) -> str:
    """Format directory contents for display."""
    entries = await storage.list(path)
    filtered = [
        entry for entry in entries
        if not entry.name.startswith(".")
    ]
    filtered.sort(key=lambda e: e.name)

    items = [
        f"{entry.name}/" if entry.kind == "directory" else entry.name
        for entry in filtered
    ]

    if items:
        listing = "\n".join(f"- {item}" for item in items)
        return f"Directory: {path}\n{listing}"
    return f"Directory: {path}"


def format_file_view(content: str, view_range: Optional[LineRange] = None) -> str:
    """Format file content with line numbers."""
    lines = content.split("\n")
    start_index = 0
    end_index = len(lines)

    if view_range and len(view_range) == 2:
        start, end = view_range
        normalized_start = max(1, start or 1)
        normalized_end = len(lines) if (end == -1 or end is None) else end
        start_index = min(len(lines), max(0, normalized_start - 1))
        end_index = min(len(lines), max(start_index, normalized_end))

    slice_lines = lines[start_index:end_index]
    return "\n".join(
        f"{str(start_index + i + 1).rjust(4)}: {line}"
        for i, line in enumerate(slice_lines)
    )


class MemoryExecutor(Protocol):
    """Protocol for memory command executor."""

    async def __call__(self, command: MemoryCommand) -> str:
        """Execute a memory command."""
        ...


def create_memory_executor(storage: Storage) -> MemoryExecutor:
    """
    Create a memory command executor.

    Args:
        storage: Storage backend implementation

    Returns:
        Async function that executes memory commands
    """

    async def executor(command: MemoryCommand) -> str:
        """Execute a memory command."""
        cmd = command["command"]

        if cmd == "view":
            target_path = assert_memory_path(command["path"])
            info = await storage.stat(target_path)

            if not info:
                raise FileNotFoundError(f"Path not found: {command['path']}")

            if info.kind == "directory":
                return await format_directory_listing(storage, target_path)

            if info.kind == "file":
                content = await storage.read(target_path)
                return format_file_view(content, command.get("view_range"))

            raise FileNotFoundError(f"Path not found: {command['path']}")

        elif cmd == "create":
            target_path = assert_memory_path(command["path"])
            parent_path = get_parent_directory(target_path)

            if parent_path:
                parent_info = await storage.stat(parent_path)
                if not parent_info:
                    await storage.ensure_directory(parent_path)
                elif parent_info.kind != "directory":
                    raise NotADirectoryError(f"Path is not a directory: {parent_path}")

            existing = await storage.stat(target_path)
            if existing and existing.kind == "directory":
                raise IsADirectoryError(f"Path is a directory: {command['path']}")

            await storage.write(target_path, command["file_text"])
            return f"File created successfully at {command['path']}"

        elif cmd == "str_replace":
            target_path = assert_memory_path(command["path"])
            info = await storage.stat(target_path)

            if not info:
                raise FileNotFoundError(f"File not found: {command['path']}")
            if info.kind != "file":
                raise IsADirectoryError(f"Path is not a file: {command['path']}")

            original = await storage.read(target_path)
            occurrences = original.count(command["old_str"])

            if occurrences == 0:
                raise ValueError(f"Text not found in {command['path']}")
            if occurrences > 1:
                raise ValueError(
                    f"Text appears {occurrences} times in {command['path']}. Must be unique."
                )

            updated = original.replace(command["old_str"], command["new_str"])
            await storage.write(target_path, updated)
            return f"File {command['path']} has been edited"

        elif cmd == "insert":
            target_path = assert_memory_path(command["path"])
            info = await storage.stat(target_path)

            if not info:
                raise FileNotFoundError(f"File not found: {command['path']}")
            if info.kind != "file":
                raise IsADirectoryError(f"Path is not a file: {command['path']}")

            original = await storage.read(target_path)
            lines = original.split("\n")
            insert_line = command["insert_line"]

            if insert_line < 0 or insert_line > len(lines):
                raise ValueError(
                    f"Invalid insert_line {insert_line}. Must be 0-{len(lines)}"
                )

            sanitized_text = command["insert_text"].rstrip("\n")
            lines.insert(insert_line, sanitized_text)
            await storage.write(target_path, "\n".join(lines))
            return f"Text inserted at line {insert_line} in {command['path']}"

        elif cmd == "delete":
            target_path = assert_memory_path(command["path"])

            if target_path == MEMORY_ROOT:
                raise ValueError(f"Cannot delete the {MEMORY_ROOT} directory itself")

            info = await storage.stat(target_path)
            if not info:
                raise FileNotFoundError(f"Path not found: {command['path']}")

            await storage.delete(target_path)
            if info.kind == "directory":
                return f"Directory deleted: {command['path']}"
            return f"File deleted: {command['path']}"

        elif cmd == "rename":
            old_path = assert_memory_path(command["old_path"])
            new_path = assert_memory_path(command["new_path"])

            old_info = await storage.stat(old_path)
            if not old_info:
                raise FileNotFoundError(f"Source path not found: {command['old_path']}")

            new_info = await storage.stat(new_path)
            if new_info:
                raise FileExistsError(f"Destination already exists: {command['new_path']}")

            new_parent = get_parent_directory(new_path)
            if new_parent:
                parent_info = await storage.stat(new_parent)
                if not parent_info:
                    await storage.ensure_directory(new_parent)
                elif parent_info.kind != "directory":
                    raise NotADirectoryError(f"Path is not a directory: {new_parent}")

            await storage.move(old_path, new_path)
            return f"Renamed {command['old_path']} to {command['new_path']}"

        else:
            import json
            serialized = json.dumps(command, indent=2)
            raise ValueError(f"Unsupported memory command payload: {serialized}")

    return executor
