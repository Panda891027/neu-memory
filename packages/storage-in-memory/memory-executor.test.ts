import { describe, expect, it } from "vitest";

import { createMemoryExecutor } from "@neutree-ai/memory";
import type {
  CreateCommand,
  DeleteCommand,
  InsertCommand,
  RenameCommand,
  StrReplaceCommand,
  ViewCommand,
} from "@neutree-ai/memory";
import { InMemoryStorage } from "./index.js";

const createExecutor = () => {
  const storage = new InMemoryStorage();
  return {
    storage,
    executor: createMemoryExecutor({ storage }),
  };
};

describe("memory executor - view", () => {
  it("lists directory entries and skips hidden files", async () => {
    const { executor, storage } = createExecutor();
    await storage.ensureDirectory("/memories/projects");
    await storage.write("/memories/projects/todo.txt", "tasks");
    await storage.write("/memories/notes.txt", "line1");
    await storage.write("/memories/.hidden", "secret");

    const command: ViewCommand = {
      command: "view",
      path: "/memories",
    };
    const result = await executor(command);
    expect(result).toBe("Directory: /memories\n- notes.txt\n- projects/");
  });

  it("renders file content with line numbers and range", async () => {
    const { executor, storage } = createExecutor();
    await storage.write(
      "/memories/log.txt",
      ["alpha", "beta", "gamma", "delta"].join("\n"),
    );

    const command: ViewCommand = {
      command: "view",
      path: "/memories/log.txt",
      view_range: [2, 3],
    };
    const result = await executor(command);
    expect(result).toBe("   2: beta\n   3: gamma");
  });

  it("rejects viewing paths outside memory root", async () => {
    const { executor } = createExecutor();
    const command: ViewCommand = {
      command: "view",
      path: "/tmp/escape",
    };
    await expect(executor(command)).rejects.toThrow(
      "Path must start with /memories, got: /tmp/escape",
    );
  });
});

describe("memory executor - create", () => {
  it("creates a file when parent directory exists", async () => {
    const { executor, storage } = createExecutor();
    await storage.ensureDirectory("/memories");

    const command: CreateCommand = {
      command: "create",
      path: "/memories/status.txt",
      file_text: "ready",
    };

    const result = await executor(command);
    expect(result).toBe("File created successfully at /memories/status.txt");
    await expect(storage.read("/memories/status.txt")).resolves.toBe("ready");
  });

  it("creates missing parent directory then signals path not found", async () => {
    const { executor, storage } = createExecutor();
    const command: CreateCommand = {
      command: "create",
      path: "/memories/team/status.txt",
      file_text: "draft",
    };
    await expect(executor(command)).rejects.toThrow(
      "Path not found: /memories/team/status.txt",
    );
    await expect(storage.stat("/memories/team")).resolves.toEqual({
      kind: "directory",
    });
  });
});

describe("memory executor - str_replace", () => {
  it("replaces unique substring successfully", async () => {
    const { executor, storage } = createExecutor();
    await storage.write("/memories/profile.txt", "I like tea");

    const command: StrReplaceCommand = {
      command: "str_replace",
      path: "/memories/profile.txt",
      old_str: "tea",
      new_str: "coffee",
    };

    const result = await executor(command);
    expect(result).toBe("File /memories/profile.txt has been edited");
    await expect(storage.read("/memories/profile.txt")).resolves.toBe(
      "I like coffee",
    );
  });

  it("rejects when substring is missing", async () => {
    const { executor, storage } = createExecutor();
    await storage.write("/memories/profile.txt", "I like tea");

    const command: StrReplaceCommand = {
      command: "str_replace",
      path: "/memories/profile.txt",
      old_str: "water",
      new_str: "coffee",
    };

    await expect(executor(command)).rejects.toThrow(
      "Text not found in /memories/profile.txt",
    );
  });

  it("rejects when substring appears multiple times", async () => {
    const { executor, storage } = createExecutor();
    await storage.write("/memories/profile.txt", "tea and tea again");

    const command: StrReplaceCommand = {
      command: "str_replace",
      path: "/memories/profile.txt",
      old_str: "tea",
      new_str: "coffee",
    };

    await expect(executor(command)).rejects.toThrow(
      "Text appears 2 times in /memories/profile.txt. Must be unique.",
    );
  });
});

describe("memory executor - insert", () => {
  it("inserts text at exact line and trims trailing newline", async () => {
    const { executor, storage } = createExecutor();
    await storage.write("/memories/diary.txt", ["one", "three"].join("\n"));

    const command: InsertCommand = {
      command: "insert",
      path: "/memories/diary.txt",
      insert_line: 1,
      insert_text: "two\n",
    };

    const result = await executor(command);
    expect(result).toBe("Text inserted at line 1 in /memories/diary.txt");
    await expect(storage.read("/memories/diary.txt")).resolves.toBe(
      ["one", "two", "three"].join("\n"),
    );
  });

  it("rejects when line is out of range", async () => {
    const { executor, storage } = createExecutor();
    await storage.write("/memories/diary.txt", ["one"].join("\n"));

    const command: InsertCommand = {
      command: "insert",
      path: "/memories/diary.txt",
      insert_line: 5,
      insert_text: "two",
    };

    await expect(executor(command)).rejects.toThrow(
      "Invalid insert_line 5. Must be 0-1",
    );
  });
});

describe("memory executor - delete", () => {
  it("deletes files", async () => {
    const { executor, storage } = createExecutor();
    await storage.write("/memories/temp.txt", "content");

    const command: DeleteCommand = {
      command: "delete",
      path: "/memories/temp.txt",
    };

    const result = await executor(command);
    expect(result).toBe("File deleted: /memories/temp.txt");
    await expect(storage.stat("/memories/temp.txt")).resolves.toBeNull();
  });

  it("deletes directories recursively", async () => {
    const { executor, storage } = createExecutor();
    await storage.ensureDirectory("/memories/archive");
    await storage.write("/memories/archive/file.txt", "old");

    const command: DeleteCommand = {
      command: "delete",
      path: "/memories/archive",
    };

    const result = await executor(command);
    expect(result).toBe("Directory deleted: /memories/archive");
    await expect(storage.stat("/memories/archive")).resolves.toBeNull();
  });

  it("rejects deleting root directory", async () => {
    const { executor } = createExecutor();
    const command: DeleteCommand = {
      command: "delete",
      path: "/memories",
    };

    await expect(executor(command)).rejects.toThrow(
      "Cannot delete the /memories directory itself",
    );
  });
});

describe("memory executor - rename", () => {
  it("renames files and creates missing parent directories", async () => {
    const { executor, storage } = createExecutor();
    await storage.write("/memories/old.txt", "legacy");

    const command: RenameCommand = {
      command: "rename",
      old_path: "/memories/old.txt",
      new_path: "/memories/archive/new.txt",
    };

    const result = await executor(command);
    expect(result).toBe(
      "Renamed /memories/old.txt to /memories/archive/new.txt",
    );
    await expect(storage.stat("/memories/old.txt")).resolves.toBeNull();
    await expect(storage.stat("/memories/archive/new.txt")).resolves.toEqual({
      kind: "file",
    });
    await expect(storage.read("/memories/archive/new.txt")).resolves.toBe(
      "legacy",
    );
  });

  it("rejects when destination already exists", async () => {
    const { executor, storage } = createExecutor();
    await storage.write("/memories/one.txt", "first");
    await storage.write("/memories/two.txt", "second");

    const command: RenameCommand = {
      command: "rename",
      old_path: "/memories/one.txt",
      new_path: "/memories/two.txt",
    };

    await expect(executor(command)).rejects.toThrow(
      "Destination already exists: /memories/two.txt",
    );
  });
});
