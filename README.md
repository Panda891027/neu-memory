# neu-memory

Lightweight, model-agnostic memory toolkit inspired by Claude's built-in memory tool. Bring long-term memory to any LLM agent with a tiny TypeScript package.

## Why neu-memory?

- Works with any runtime: drop into OpenAI SDK, Vercel AI SDK, LangChain, or your own agent loop.
- Fast integration: give agents long-term recall in minutes, with zero runtime dependencies.
- Storage agnostic: use the same interface across local filesystems, database, or cloud object stores.
- 100% open source.

## Quickstart

Install:

```bash
npm install @neutree-ai/memory
# or: yarn add @neutree-ai/memory
```

Create a tool with the bundled in-memory backend:

```ts
import { createMemoryTool } from "@neutree-ai/memory";
import { InMemoryStorage } from "@neutree-ai/memory/storage/in-memory";

const storage = new InMemoryStorage();
const memoryKit = createMemoryTool({
  toolName: "workspace-memory",
  storage,
});

const result = await memoryKit.execute({
  command: "create",
  path: "/memories/log.txt",
  file_text: "First note!",
});

console.log(result);
// => "File created successfully at /memories/log.txt"
```

Drop the kit into Vercel AI SDK:

```ts
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { createMemoryTool } from "@neutree-ai/memory";
import { InMemoryStorage } from "@neutree-ai/memory/storage/in-memory";

const memoryKit = createMemoryTool({
  storage: new InMemoryStorage(),
});

const result = await streamText({
  model: openai("gpt-4o-mini"),
  // Coach the model to use memoryKit before it starts working.
  system: memoryKit.systemPrompt,
  prompt: "Draft a project update based on the latest repository activity.",
  tools: {
    [memoryKit.name]: {
      // Expose the generated spec so the SDK can validate tool calls.
      description: memoryKit.toolDescription,
      parameters: memoryKit.toolJsonSchema,
      // Delegate execution to memoryKit.
      execute: memoryKit.execute,
    },
  },
});
```

## Examples

The [examples](examples/) directory contains runnable examples with different AI SDKs:

- [Vercel AI SDK + InMemoryStorage](examples/vercel-ai-sdk-in-memory.ts)
- [OpenAI SDK + NodeFileSystemStorage](examples/openai-sdk-node-fs.ts)

To run:

```bash
cd examples && yarn install
cp .env.example .env  # Add your API key and optionally set OPENAI_BASE_URL
npx tsx <example-file>.ts
```

All examples use `dotenv` to load environment variables from `.env`.

## How it works

neu-memory keeps the memory contract small and explicit:

1. **Command schema** — strongly typed definitions for `view`, `create`, `str_replace`, `insert`, `delete`, `rename` requests.
2. **Executor** — validates `/memories` paths, routes commands, and formats responses for agents.
3. **Storage interface** — plug in any storage backend by implementing seven familiar filesystem-like methods. See [`src/runtime/storage.ts`](src/runtime/storage.ts) for the full contract.

## Contributing

Please read the [contribution guide](CONTRIBUTING.md) before opening an issue or pull request.

## License

Apache-2.0. See [LICENSE](LICENSE) for details.
