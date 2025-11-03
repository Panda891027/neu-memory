"""Filesystem-backed storage implementation."""

import os
import shutil
from pathlib import Path
from typing import Optional, List

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
    from dataclasses import dataclass

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


def normalize_memory_path(memory_path: str) -> str:
    """Normalize memory path by removing trailing slashes."""
    if memory_path == MEMORY_ROOT:
        return memory_path
    return memory_path.rstrip("/") or MEMORY_ROOT


def get_parent_memory_path(memory_path: str) -> Optional[str]:
    """Get parent path of a memory path."""
    normalized = normalize_memory_path(memory_path)
    if normalized == MEMORY_ROOT:
        return None
    last_slash = normalized.rfind("/")
    if last_slash <= 0:
        return MEMORY_ROOT
    return normalized[:last_slash] or MEMORY_ROOT


class FileSystemStorage(Storage):
    """
    Filesystem-backed storage implementation.

    Provides persistent storage using the local filesystem.
    """

    def __init__(self, root_directory: str):
        """
        Initialize filesystem storage.

        Args:
            root_directory: Physical directory to store memory files
        """
        self.root_directory = Path(root_directory).resolve()

    @classmethod
    async def init(cls, root_directory: str) -> "FileSystemStorage":
        """
        Initialize filesystem storage and ensure root directory exists.

        Args:
            root_directory: Physical directory to store memory files

        Returns:
            FileSystemStorage instance
        """
        storage = cls(root_directory)
        await storage.ensure_directory(MEMORY_ROOT)
        return storage

    def _resolve_path(self, memory_path: str) -> Path:
        """
        Resolve memory path to physical filesystem path.

        Args:
            memory_path: Path within /memories

        Returns:
            Resolved filesystem path

        Raises:
            ValueError: If path doesn't start with MEMORY_ROOT or escapes root
        """
        if not memory_path.startswith(MEMORY_ROOT):
            raise ValueError(f"Path must start with {MEMORY_ROOT}: {memory_path}")

        relative = memory_path[len(MEMORY_ROOT):].lstrip("/")
        target = self.root_directory / relative if relative else self.root_directory
        target = target.resolve()

        # Security check: ensure path doesn't escape root
        try:
            target.relative_to(self.root_directory)
        except ValueError:
            raise ValueError(f"Path escapes memory root: {memory_path}")

        return target

    async def stat(self, path: str) -> Optional[StoragePathInfo]:
        """Return metadata describing the path."""
        resolved_path = self._resolve_path(path)
        try:
            if resolved_path.is_dir():
                return StoragePathInfo(kind="directory")
            elif resolved_path.is_file():
                return StoragePathInfo(kind="file")
            return None
        except OSError:
            return None

    async def read(self, path: str) -> str:
        """Read textual content from a file at the path."""
        resolved_path = self._resolve_path(path)
        return resolved_path.read_text(encoding="utf-8")

    async def write(self, path: str, content: str) -> None:
        """Write textual content to the path."""
        resolved_path = self._resolve_path(path)
        resolved_path.write_text(content, encoding="utf-8")

    async def delete(self, path: str) -> None:
        """Delete a file or directory at the path."""
        resolved_path = self._resolve_path(path)
        if resolved_path.is_dir():
            shutil.rmtree(resolved_path)
        else:
            resolved_path.unlink()

    async def move(self, old_path: str, new_path: str) -> None:
        """Move or rename a file or directory."""
        resolved_old = self._resolve_path(old_path)
        resolved_new = self._resolve_path(new_path)

        # Ensure parent directory exists
        parent = get_parent_memory_path(new_path)
        if parent:
            await self.ensure_directory(parent)

        resolved_old.rename(resolved_new)

    async def ensure_directory(self, path: str) -> None:
        """Ensure the directory exists, creating parents as needed."""
        resolved_path = self._resolve_path(path)
        resolved_path.mkdir(parents=True, exist_ok=True)

    async def list(self, path: str) -> List[StorageDirectoryEntry]:
        """List entries within a directory."""
        resolved_path = self._resolve_path(path)
        entries = []

        for item in resolved_path.iterdir():
            kind = "directory" if item.is_dir() else "file"
            entries.append(StorageDirectoryEntry(name=item.name, kind=kind))  # type: ignore

        return entries
