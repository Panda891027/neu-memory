import { promises as fs } from "node:fs";
import { resolve } from "node:path";

import { MEMORY_ROOT } from "../runtime/memory-executor.js";
import type {
  Storage,
  StorageDirectoryEntry,
  StoragePathInfo,
} from "../runtime/storage.js";

const normalizeMemoryPath = (memoryPath: string): string => {
  if (memoryPath === MEMORY_ROOT) {
    return MEMORY_ROOT;
  }
  return memoryPath.replace(/\/+$/, "") || MEMORY_ROOT;
};

const getParentMemoryPath = (memoryPath: string): string | null => {
  const normalized = normalizeMemoryPath(memoryPath);
  if (normalized === MEMORY_ROOT) {
    return null;
  }
  const lastSlash = normalized.lastIndexOf("/");
  if (lastSlash <= 0) {
    return MEMORY_ROOT;
  }
  return normalized.slice(0, lastSlash) || MEMORY_ROOT;
};

const isErrno = (error: unknown, code: string): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: string }).code === code;

/**
 * Node.js filesystem-backed storage implementation.
 */
export class NodeFileSystemStorage implements Storage {
  private readonly resolvedRoot: string;

  private constructor(private readonly rootDirectory: string) {
    this.resolvedRoot = resolve(rootDirectory);
  }

  static async init(rootDirectory: string): Promise<NodeFileSystemStorage> {
    const storage = new NodeFileSystemStorage(rootDirectory);
    await storage.ensureDirectory(MEMORY_ROOT);
    return storage;
  }

  private resolvePath(memoryPath: string): string {
    if (!memoryPath.startsWith(MEMORY_ROOT)) {
      throw new Error(`Path must start with ${MEMORY_ROOT}: ${memoryPath}`);
    }
    const relative = memoryPath.slice(MEMORY_ROOT.length).replace(/^\/+/, "");
    const target = relative
      ? resolve(this.resolvedRoot, relative)
      : this.resolvedRoot;
    if (!target.startsWith(this.resolvedRoot)) {
      throw new Error(`Path escapes memory root: ${memoryPath}`);
    }
    return target;
  }

  async stat(path: string): Promise<StoragePathInfo | null> {
    const resolvedPath = this.resolvePath(path);
    try {
      const stats = await fs.stat(resolvedPath);
      if (stats.isDirectory()) {
        return { kind: "directory" };
      }
      if (stats.isFile()) {
        return { kind: "file" };
      }
      return null;
    } catch (error) {
      if (isErrno(error, "ENOENT")) {
        return null;
      }
      throw error;
    }
  }

  async read(path: string): Promise<string> {
    const resolvedPath = this.resolvePath(path);
    return fs.readFile(resolvedPath, "utf8");
  }

  async write(path: string, content: string): Promise<void> {
    const resolvedPath = this.resolvePath(path);
    await fs.writeFile(resolvedPath, content, "utf8");
  }

  async delete(path: string): Promise<void> {
    const resolvedPath = this.resolvePath(path);
    await fs.rm(resolvedPath, { recursive: true, force: false });
  }

  async move(oldPath: string, newPath: string): Promise<void> {
    const resolvedOld = this.resolvePath(oldPath);
    const resolvedNew = this.resolvePath(newPath);
    const parent = getParentMemoryPath(newPath);
    if (parent) {
      await this.ensureDirectory(parent);
    }
    await fs.rename(resolvedOld, resolvedNew);
  }

  async ensureDirectory(path: string): Promise<void> {
    const resolvedPath = this.resolvePath(path);
    await fs.mkdir(resolvedPath, { recursive: true });
  }

  async list(path: string): Promise<readonly StorageDirectoryEntry[]> {
    const resolvedPath = this.resolvePath(path);
    const entries = await fs.readdir(resolvedPath);
    const withKinds = await Promise.all(
      entries.map(async (name) => {
        const entryPath = resolve(resolvedPath, name);
        const stats = await fs.stat(entryPath);
        const kind = stats.isDirectory() ? "directory" : "file";
        return { name, kind } as StorageDirectoryEntry;
      }),
    );
    return withKinds;
  }
}
