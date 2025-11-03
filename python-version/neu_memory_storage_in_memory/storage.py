"""Simple in-memory storage implementation."""

from typing import Optional, Dict, List, Union
from dataclasses import dataclass

try:
    from neu_memory import (
        Storage,
        StoragePathInfo,
        StorageDirectoryEntry,
        MEMORY_ROOT,
    )
except ImportError:
    # Fallback for development
    from typing import Literal

    MEMORY_ROOT = "/memories"

    @dataclass(frozen=True)
    class StoragePathInfo:
        kind: Literal["file", "directory"]

    @dataclass(frozen=True)
    class StorageDirectoryEntry:
        name: str
        kind: Literal["file", "directory"]

    class Storage:
        pass


@dataclass
class FileNode:
    """File node in memory tree."""
    kind: str = "file"
    content: str = ""


@dataclass
class DirectoryNode:
    """Directory node in memory tree."""
    kind: str = "directory"
    children: Dict[str, Union[FileNode, "DirectoryNode"]] = None

    def __post_init__(self):
        if self.children is None:
            self.children = {}


Node = Union[FileNode, DirectoryNode]


class InMemoryStorage(Storage):
    """
    Simple in-memory storage implementation useful for testing or ephemeral workflows.

    Paths must stay under `/memories`; callers are responsible for enforcing
    any additional policies.
    """

    def __init__(self):
        """Initialize in-memory storage with empty root directory."""
        self.root = DirectoryNode()

    async def stat(self, path: str) -> Optional[StoragePathInfo]:
        """Return metadata describing the path."""
        node = self._get_node(path)
        if not node:
            return None
        return StoragePathInfo(kind=node.kind)  # type: ignore

    async def read(self, path: str) -> str:
        """Read textual content from a file at the path."""
        node = self._get_node(path)
        if not node or node.kind != "file":
            raise IOError(f"Cannot read non-file path: {path}")
        return node.content  # type: ignore

    async def write(self, path: str, content: str) -> None:
        """Write textual content to the path."""
        segments = self._get_segments(path)
        parent = self._get_directory_node(segments[:-1])
        if not parent:
            raise IOError(f"Missing parent directory for {path}")

        name = segments[-1] if segments else None
        if not name:
            raise ValueError("Cannot write to root directory")

        parent.children[name] = FileNode(content=content)

    async def delete(self, path: str) -> None:
        """Delete a file or directory at the path."""
        if path == MEMORY_ROOT:
            raise ValueError("Cannot delete root directory")

        segments = self._get_segments(path)
        parent = self._get_directory_node(segments[:-1])
        if not parent:
            raise IOError(f"Missing parent directory for {path}")

        name = segments[-1] if segments else None
        if not name or name not in parent.children:
            raise FileNotFoundError(f"Path not found: {path}")

        del parent.children[name]

    async def move(self, old_path: str, new_path: str) -> None:
        """Move or rename a file or directory."""
        old_segments = self._get_segments(old_path)
        old_parent = self._get_directory_node(old_segments[:-1])
        old_name = old_segments[-1] if old_segments else None

        if not old_parent or not old_name:
            raise FileNotFoundError(f"Source path not found: {old_path}")

        node = old_parent.children.get(old_name)
        if not node:
            raise FileNotFoundError(f"Source path not found: {old_path}")

        del old_parent.children[old_name]

        new_segments = self._get_segments(new_path)
        new_parent = self._get_or_create_directory(new_segments[:-1])
        new_name = new_segments[-1] if new_segments else None

        if not new_name:
            raise ValueError("Cannot move to root directory")

        new_parent.children[new_name] = node

    async def ensure_directory(self, path: str) -> None:
        """Ensure the directory exists, creating parents as needed."""
        self._get_or_create_directory(self._get_segments(path))

    async def list(self, path: str) -> List[StorageDirectoryEntry]:
        """List entries within a directory."""
        node = self._get_node(path)
        if not node or node.kind != "directory":
            raise IOError(f"Cannot list non-directory path: {path}")

        return [
            StorageDirectoryEntry(name=name, kind=child.kind)  # type: ignore
            for name, child in node.children.items()  # type: ignore
        ]

    def _get_segments(self, path: str) -> List[str]:
        """Split path into segments."""
        if not path.startswith(MEMORY_ROOT):
            raise ValueError(f"Path must start with {MEMORY_ROOT}: {path}")

        trimmed = path[len(MEMORY_ROOT):].strip("/")
        if not trimmed:
            return []
        return trimmed.split("/")

    def _get_node(self, path: str) -> Optional[Node]:
        """Get node at path."""
        segments = self._get_segments(path)
        if not segments:
            return self.root

        current: Node = self.root
        for segment in segments:
            if current.kind != "directory":
                return None
            next_node = current.children.get(segment)  # type: ignore
            if not next_node:
                return None
            current = next_node
        return current

    def _get_directory_node(self, segments: List[str]) -> Optional[DirectoryNode]:
        """Get directory node at segments path."""
        current = self.root
        for segment in segments:
            next_node = current.children.get(segment)
            if not next_node or next_node.kind != "directory":
                return None
            current = next_node  # type: ignore
        return current

    def _get_or_create_directory(self, segments: List[str]) -> DirectoryNode:
        """Get or create directory at segments path."""
        current = self.root
        for segment in segments:
            existing = current.children.get(segment)
            if existing:
                if existing.kind != "directory":
                    raise ValueError(f"Path is not a directory: {segment}")
                current = existing  # type: ignore
            else:
                next_dir = DirectoryNode()
                current.children[segment] = next_dir
                current = next_dir
        return current
