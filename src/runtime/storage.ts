export type StoragePathKind = "file" | "directory";

export interface StoragePathInfo {
  readonly kind: StoragePathKind;
}

export interface StorageDirectoryEntry {
  readonly name: string;
  readonly kind: StoragePathKind;
}

export interface Storage {
  /**
   * Return metadata describing the path. Null when the path does not exist.
   */
  stat(path: string): Promise<StoragePathInfo | null>;

  /**
   * Read textual content from a file at the path.
   */
  read(path: string): Promise<string>;

  /**
   * Write textual content to the path, overwriting if it already exists.
   */
  write(path: string, content: string): Promise<void>;

  /**
   * Delete a file or directory at the path.
   */
  delete(path: string): Promise<void>;

  /**
   * Move or rename a file or directory.
   */
  move(oldPath: string, newPath: string): Promise<void>;

  /**
   * Ensure the directory exists, creating parents as needed.
   */
  ensureDirectory(path: string): Promise<void>;

  /**
   * List entries within a directory. Returns empty array for empty directories.
   */
  list(path: string): Promise<readonly StorageDirectoryEntry[]>;
}
