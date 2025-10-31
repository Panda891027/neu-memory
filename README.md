# Open Memory Tool

TypeScript implementation scaffolding for a Claude-compatible memory tool. The project mirrors Anthropic's documented contract so that an agent can persist knowledge under a `/memories` directory without shipping runtime dependencies.

## Layout

- `src/types/commands.ts`: strongly-typed command schema (`view`, `create`, `str_replace`, `insert`, `delete`, `rename`).
- `src/prompts/system-prompt.ts`: factory for the memory protocol system prompt (tool name placeholder included).
- `src/prompts/tool-description.ts`: factory for Markdown command documentation.
- `src/runtime/memory-executor.ts`: command dispatcher that delegates to a storage backend.
- `src/runtime/storage.ts`: abstract storage contract (works with memory, filesystem, DB, or object-store backends).
- `src/storage/in-memory.ts`: lightweight in-memory `Storage` implementation for testing.
- `src/index.ts`: factory (`createMemoryTool`) that wires prompts, schema, and executor.
- `src/schema/tool-json-schema.ts`: factory for the tool JSON schema definition.

## Factory usage

```ts
import { createMemoryTool } from "open-memory-tool";
import { InMemoryStorage } from "open-memory-tool/storage/in-memory";

const storage = new InMemoryStorage();

const memoryTool = createMemoryTool({
  toolName: "custom-memory",
  storage,
});

memoryTool.name; // "custom-memory"
memoryTool.systemPrompt; // system prompt string
memoryTool.toolDescription; // Markdown tool description
memoryTool.toolJsonSchema; // JSON schema for tool input (use in tool declaration)
const toolResult = await memoryTool.execute({ command: "view", path: "/memories" });

// Node.js filesystem example:
// import { NodeFileSystemStorage } from "open-memory-tool/storage/node-fs";
// const storage = await NodeFileSystemStorage.init("./memory");
```

Future work can layer on JSON parsing, default storage implementations, and evaluation harnesses; the executor already dispatches to the injected storage implementation.
The `Storage` interface must implement the seven methods `stat/read/write/delete/move/ensureDirectory/list`, enabling the executor to compose directory listings and file operations across different backends.

## Scripts

- `yarn build`: compile TypeScript to `dist/`.
- `yarn run check`: strict type-check without emitting output.
- `yarn lint`: run Biome lint checks.
- `yarn format`: apply Biome formatting fixes in-place.
- `yarn test`: execute Vitest in single-run mode.
- `yarn test:watch`: start Vitest in watch mode for local development.

## Next steps

1. Implement a higher-level mediator that binds parsed commands and executor results to your agent runtime (tool call in, tool result out).
2. Extend the storage layer with security policies (size limits, sensitive content filters, path normalization tests).
3. Design evaluation harnesses (DSPy/GEPA-inspired) to iterate on prompt quality and command usage heuristics.
