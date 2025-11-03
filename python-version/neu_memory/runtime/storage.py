"""Storage interface for neu-memory."""

from abc import ABC, abstractmethod
from typing import Literal, Optional, List
from dataclasses import dataclass

StoragePathKind = Literal["file", "directory"]


@dataclass(frozen=True)
class StoragePathInfo:
    """Metadata describing a path."""
    kind: StoragePathKind


@dataclass(frozen=True)
class StorageDirectoryEntry:
    """Entry within a directory listing."""
    name: str
    kind: StoragePathKind


class Storage(ABC):
    """Abstract storage interface for memory persistence."""

    @abstractmethod
    async def stat(self, path: str) -> Optional[StoragePathInfo]:
        """
        Return metadata describing the path. None when the path does not exist.

        Args:
            path: The path to check

        Returns:
            StoragePathInfo if path exists, None otherwise
        """
        pass

    @abstractmethod
    async def read(self, path: str) -> str:
        """
        Read textual content from a file at the path.

        Args:
            path: The file path to read

        Returns:
            The file content as a string
        """
        pass

    @abstractmethod
    async def write(self, path: str, content: str) -> None:
        """
        Write textual content to the path, overwriting if it already exists.

        Args:
            path: The file path to write
            content: The content to write
        """
        pass

    @abstractmethod
    async def delete(self, path: str) -> None:
        """
        Delete a file or directory at the path.

        Args:
            path: The path to delete
        """
        pass

    @abstractmethod
    async def move(self, old_path: str, new_path: str) -> None:
        """
        Move or rename a file or directory.

        Args:
            old_path: The current path
            new_path: The destination path
        """
        pass

    @abstractmethod
    async def ensure_directory(self, path: str) -> None:
        """
        Ensure the directory exists, creating parents as needed.

        Args:
            path: The directory path to ensure
        """
        pass

    @abstractmethod
    async def list(self, path: str) -> List[StorageDirectoryEntry]:
        """
        List entries within a directory. Returns empty list for empty directories.

        Args:
            path: The directory path to list

        Returns:
            List of directory entries
        """
        pass
