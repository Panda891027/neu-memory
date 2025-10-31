import {
  MEMORY_ROOT,
  type Storage,
  type StorageDirectoryEntry,
  type StoragePathInfo,
} from "@neutree-ai/memory";

type FileNode = {
  kind: "file";
  content: string;
};

type DirectoryNode = {
  kind: "directory";
  children: Map<string, Node>;
};

type Node = FileNode | DirectoryNode;

/**
 * Simple in-memory storage implementation useful for testing or ephemeral workflows.
 * Paths must stay under `/memories`; callers are responsible for enforcing any additional policies.
 */
export class InMemoryStorage implements Storage {
  private readonly root: DirectoryNode = {
    kind: "directory",
    children: new Map(),
  };

  async stat(path: string): Promise<StoragePathInfo | null> {
    const node = this.getNode(path);
    if (!node) {
      return null;
    }
    return { kind: node.kind };
  }

  async read(path: string): Promise<string> {
    const node = this.getNode(path);
    if (!node || node.kind !== "file") {
      throw new Error(`Cannot read non-file path: ${path}`);
    }
    return node.content;
  }

  async write(path: string, content: string): Promise<void> {
    const segments = this.getSegments(path);
    const parent = this.getDirectoryNode(segments.slice(0, -1));
    if (!parent) {
      throw new Error(`Missing parent directory for ${path}`);
    }

    const name = segments.at(-1);
    if (!name) {
      throw new Error("Cannot write to root directory");
    }

    parent.children.set(name, { kind: "file", content });
  }

  async delete(path: string): Promise<void> {
    if (path === MEMORY_ROOT) {
      throw new Error("Cannot delete root directory");
    }

    const segments = this.getSegments(path);
    const parent = this.getDirectoryNode(segments.slice(0, -1));
    if (!parent) {
      throw new Error(`Missing parent directory for ${path}`);
    }

    const name = segments.at(-1);
    if (!name || !parent.children.has(name)) {
      throw new Error(`Path not found: ${path}`);
    }
    parent.children.delete(name);
  }

  async move(oldPath: string, newPath: string): Promise<void> {
    const oldSegments = this.getSegments(oldPath);
    const oldParent = this.getDirectoryNode(oldSegments.slice(0, -1));
    const oldName = oldSegments.at(-1);
    if (!oldParent || !oldName) {
      throw new Error(`Source path not found: ${oldPath}`);
    }
    const node = oldParent.children.get(oldName);
    if (!node) {
      throw new Error(`Source path not found: ${oldPath}`);
    }
    oldParent.children.delete(oldName);

    const newSegments = this.getSegments(newPath);
    const newParent = this.getOrCreateDirectory(newSegments.slice(0, -1));
    const newName = newSegments.at(-1);
    if (!newName) {
      throw new Error("Cannot move to root directory");
    }
    newParent.children.set(newName, node);
  }

  async ensureDirectory(path: string): Promise<void> {
    this.getOrCreateDirectory(this.getSegments(path));
  }

  async list(path: string): Promise<readonly StorageDirectoryEntry[]> {
    const node = this.getNode(path);
    if (!node || node.kind !== "directory") {
      throw new Error(`Cannot list non-directory path: ${path}`);
    }
    return Array.from(node.children.entries()).map(([name, child]) => ({
      name,
      kind: child.kind,
    }));
  }

  private getSegments(path: string): string[] {
    if (!path.startsWith(MEMORY_ROOT)) {
      throw new Error(`Path must start with ${MEMORY_ROOT}: ${path}`);
    }
    const trimmed = path.slice(MEMORY_ROOT.length).replace(/^\/+|\/+$/g, "");
    if (!trimmed) {
      return [];
    }
    return trimmed.split("/");
  }

  private getNode(path: string): Node | null {
    const segments = this.getSegments(path);
    if (segments.length === 0) {
      return this.root;
    }

    let current: Node = this.root;
    for (const segment of segments) {
      if (current.kind !== "directory") {
        return null;
      }
      const next = current.children.get(segment);
      if (!next) {
        return null;
      }
      current = next;
    }
    return current;
  }

  private getDirectoryNode(segments: string[]): DirectoryNode | null {
    let current: DirectoryNode = this.root;
    for (const segment of segments) {
      const next = current.children.get(segment);
      if (!next || next.kind !== "directory") {
        return null;
      }
      current = next;
    }
    return current;
  }

  private getOrCreateDirectory(segments: string[]): DirectoryNode {
    let current: DirectoryNode = this.root;
    for (const segment of segments) {
      const existing = current.children.get(segment);
      if (existing) {
        if (existing.kind !== "directory") {
          throw new Error(`Path is not a directory: ${segment}`);
        }
        current = existing;
      } else {
        const next: DirectoryNode = { kind: "directory", children: new Map() };
        current.children.set(segment, next);
        current = next;
      }
    }
    return current;
  }
}
