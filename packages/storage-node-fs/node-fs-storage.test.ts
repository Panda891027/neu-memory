import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { promises as fs } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

import { NodeFileSystemStorage } from "./index.js";
import { MEMORY_ROOT } from "@neutree-ai/memory";

let tempRoot: string;
let storage: NodeFileSystemStorage;

beforeAll(async () => {
  tempRoot = await fs.mkdtemp(join(tmpdir(), "memory-tool-"));
  storage = await NodeFileSystemStorage.init(tempRoot);
});

afterAll(async () => {
  await fs.rm(tempRoot, { recursive: true, force: true });
});

beforeEach(async () => {
  // Clean memories directory before each test
  const rootPath = resolve(tempRoot);
  const entries = await fs.readdir(rootPath);
  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = resolve(rootPath, entry);
      if (entry !== "memories") {
        await fs.rm(entryPath, { recursive: true, force: true });
        return;
      }
      // clear memory directory contents
      const memoriesEntries = await fs.readdir(entryPath);
      await Promise.all(
        memoriesEntries.map((memoryEntry) =>
          fs.rm(join(entryPath, memoryEntry), { recursive: true, force: true }),
        ),
      );
    }),
  );
});

afterEach(async () => {
  // ensure root exists for subsequent tests
  await storage.ensureDirectory(MEMORY_ROOT);
});

describe("node filesystem storage", () => {
  it("writes and reads files", async () => {
    await storage.ensureDirectory(`${MEMORY_ROOT}/projects`);
    await storage.write(`${MEMORY_ROOT}/projects/todo.txt`, "tasks");

    const statInfo = await storage.stat(`${MEMORY_ROOT}/projects/todo.txt`);
    expect(statInfo).toEqual({ kind: "file" });

    const content = await storage.read(`${MEMORY_ROOT}/projects/todo.txt`);
    expect(content).toBe("tasks");
  });

  it("lists directory entries with kinds", async () => {
    await storage.ensureDirectory(`${MEMORY_ROOT}/notes`);
    await storage.write(`${MEMORY_ROOT}/notes/a.txt`, "A");
    await storage.ensureDirectory(`${MEMORY_ROOT}/notes/archive`);

    const entries = await storage.list(`${MEMORY_ROOT}/notes`);
    expect(entries).toEqual(
      expect.arrayContaining([
        { name: "a.txt", kind: "file" },
        { name: "archive", kind: "directory" },
      ]),
    );
  });

  it("moves files into new directories", async () => {
    await storage.write(`${MEMORY_ROOT}/old.txt`, "data");
    await storage.move(
      `${MEMORY_ROOT}/old.txt`,
      `${MEMORY_ROOT}/archive/new.txt`,
    );

    expect(await storage.stat(`${MEMORY_ROOT}/old.txt`)).toBeNull();
    expect(await storage.stat(`${MEMORY_ROOT}/archive/new.txt`)).toEqual({
      kind: "file",
    });
    expect(await storage.read(`${MEMORY_ROOT}/archive/new.txt`)).toBe("data");
  });

  it("deletes directories recursively", async () => {
    await storage.ensureDirectory(`${MEMORY_ROOT}/remove`);
    await storage.write(`${MEMORY_ROOT}/remove/file.txt`, "temp");
    await storage.delete(`${MEMORY_ROOT}/remove`);

    expect(await storage.stat(`${MEMORY_ROOT}/remove`)).toBeNull();
  });
});
