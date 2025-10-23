import type { MemoryCommand } from "../types/commands.js";
import type { Storage } from "./storage.js";

const MEMORY_ROOT = "/memories";

const stripTrailingSlash = (path: string): string => {
  if (path === MEMORY_ROOT) {
    return path;
  }
  return path.replace(/\/+$/, "") || MEMORY_ROOT;
};

const assertMemoryPath = (path: string): string => {
  if (!path.startsWith(MEMORY_ROOT)) {
    throw new Error(`Path must start with ${MEMORY_ROOT}, got: ${path}`);
  }
  return stripTrailingSlash(path);
};

const getParentDirectory = (path: string): string | null => {
  const normalized = stripTrailingSlash(path);
  if (normalized === MEMORY_ROOT) {
    return null;
  }
  const lastSlash = normalized.lastIndexOf("/");
  if (lastSlash <= 0) {
    return MEMORY_ROOT;
  }
  return normalized.slice(0, lastSlash) || MEMORY_ROOT;
};

export type MemoryExecutor = (command: MemoryCommand) => Promise<string>;

export interface CreateMemoryExecutorOptions {
  readonly storage: Storage;
}

const formatDirectoryListing = async (
  storage: Storage,
  path: string,
): Promise<string> => {
  const entries = await storage.list(path);
  const filtered = entries
    .filter((entry) => !entry.name.startsWith("."))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) =>
      entry.kind === "directory" ? `${entry.name}/` : entry.name,
    );

  const listing = filtered.map((item) => `- ${item}`).join("\n");
  return listing.length > 0
    ? `Directory: ${path}\n${listing}`
    : `Directory: ${path}`;
};

const formatFileView = (
  content: string,
  viewRange?: readonly [number, number],
): string => {
  const lines = content.split("\n");
  let startIndex = 0;
  let endIndex = lines.length;

  if (viewRange && viewRange.length === 2) {
    const [start, end] = viewRange;
    const normalizedStart = Math.max(1, start ?? 1);
    const normalizedEnd = end === -1 || end === undefined ? lines.length : end;
    startIndex = Math.min(lines.length, Math.max(0, normalizedStart - 1));
    endIndex = Math.min(lines.length, Math.max(startIndex, normalizedEnd));
  }

  const slice = lines.slice(startIndex, endIndex);
  return slice
    .map(
      (line, index) =>
        `${String(startIndex + index + 1).padStart(4, " ")}: ${line}`,
    )
    .join("\n");
};

export const createMemoryExecutor = (
  options: CreateMemoryExecutorOptions,
): MemoryExecutor => {
  const { storage } = options;
  return async (command: MemoryCommand): Promise<string> => {
    switch (command.command) {
      case "view": {
        const targetPath = assertMemoryPath(command.path);
        const info = await storage.stat(targetPath);
        if (!info) {
          throw new Error(`Path not found: ${command.path}`);
        }

        if (info.kind === "directory") {
          return formatDirectoryListing(storage, targetPath);
        }

        if (info.kind === "file") {
          const content = await storage.read(targetPath);
          return formatFileView(content, command.view_range);
        }

        throw new Error(`Path not found: ${command.path}`);
      }
      case "create": {
        const targetPath = assertMemoryPath(command.path);
        const parentPath = getParentDirectory(targetPath);

        if (parentPath) {
          const parentInfo = await storage.stat(parentPath);
          if (!parentInfo) {
            await storage.ensureDirectory(parentPath);
            throw new Error(`Path not found: ${command.path}`);
          }
          if (parentInfo.kind !== "directory") {
            throw new Error(`Path is not a directory: ${parentPath}`);
          }
        }

        const existing = await storage.stat(targetPath);
        if (existing && existing.kind === "directory") {
          throw new Error(`Path is a directory: ${command.path}`);
        }

        await storage.write(targetPath, command.file_text);
        return `File created successfully at ${command.path}`;
      }
      case "str_replace": {
        const targetPath = assertMemoryPath(command.path);
        const info = await storage.stat(targetPath);
        if (!info) {
          throw new Error(`File not found: ${command.path}`);
        }
        if (info.kind !== "file") {
          throw new Error(`Path is not a file: ${command.path}`);
        }

        const original = await storage.read(targetPath);
        const occurrences = original.split(command.old_str).length - 1;

        if (occurrences === 0) {
          throw new Error(`Text not found in ${command.path}`);
        }
        if (occurrences > 1) {
          throw new Error(
            `Text appears ${occurrences} times in ${command.path}. Must be unique.`,
          );
        }

        const updated = original.replace(command.old_str, command.new_str);
        await storage.write(targetPath, updated);
        return `File ${command.path} has been edited`;
      }
      case "insert": {
        const targetPath = assertMemoryPath(command.path);
        const info = await storage.stat(targetPath);

        if (!info) {
          throw new Error(`File not found: ${command.path}`);
        }
        if (info.kind !== "file") {
          throw new Error(`Path is not a file: ${command.path}`);
        }

        const original = await storage.read(targetPath);
        const lines = original.split("\n");
        if (command.insert_line < 0 || command.insert_line > lines.length) {
          throw new Error(
            `Invalid insert_line ${command.insert_line}. Must be 0-${lines.length}`,
          );
        }

        const sanitizedText = command.insert_text.replace(/\n$/, "");
        lines.splice(command.insert_line, 0, sanitizedText);
        await storage.write(targetPath, lines.join("\n"));
        return `Text inserted at line ${command.insert_line} in ${command.path}`;
      }
      case "delete": {
        const targetPath = assertMemoryPath(command.path);

        if (targetPath === MEMORY_ROOT) {
          throw new Error(`Cannot delete the ${MEMORY_ROOT} directory itself`);
        }

        const info = await storage.stat(targetPath);
        if (!info) {
          throw new Error(`Path not found: ${command.path}`);
        }

        await storage.delete(targetPath);
        if (info.kind === "directory") {
          return `Directory deleted: ${command.path}`;
        }
        return `File deleted: ${command.path}`;
      }
      case "rename": {
        const oldPath = assertMemoryPath(command.old_path);
        const newPath = assertMemoryPath(command.new_path);

        const oldInfo = await storage.stat(oldPath);
        if (!oldInfo) {
          throw new Error(`Source path not found: ${command.old_path}`);
        }

        const newInfo = await storage.stat(newPath);
        if (newInfo) {
          throw new Error(`Destination already exists: ${command.new_path}`);
        }

        const newParent = getParentDirectory(newPath);
        if (newParent) {
          const parentInfo = await storage.stat(newParent);
          if (!parentInfo) {
            await storage.ensureDirectory(newParent);
          } else if (parentInfo.kind !== "directory") {
            throw new Error(`Path is not a directory: ${newParent}`);
          }
        }

        await storage.move(oldPath, newPath);
        return `Renamed ${command.old_path} to ${command.new_path}`;
      }
      default: {
        const serialized = JSON.stringify(command, null, 2);
        throw new Error(`Unsupported memory command payload: ${serialized}`);
      }
    }
  };
};
