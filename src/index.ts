import {
  DEFAULT_MEMORY_TOOL_NAME,
  type MemoryCommand,
  type MemoryToolName,
} from "./types/commands.js";
import { createSystemPrompt } from "./prompts/system-prompt.js";
import { createToolDescription } from "./prompts/tool-description.js";
import { createToolJsonSchema } from "./schema/tool-json-schema.js";
import { createMemoryExecutor } from "./runtime/memory-executor.js";
import type { Storage } from "./runtime/storage.js";

export interface CreateMemoryToolOptions {
  readonly toolName?: MemoryToolName;
  readonly storage: Storage;
}

export interface MemoryToolKit {
  readonly name: MemoryToolName;
  readonly systemPrompt: string;
  readonly toolDescription: string;
  readonly toolJsonSchema: Readonly<Record<string, unknown>>;
  readonly execute: (command: MemoryCommand) => Promise<string>;
}

export const createMemoryTool = (
  options: CreateMemoryToolOptions,
): MemoryToolKit => {
  const { storage } = options;
  const name = options.toolName ?? DEFAULT_MEMORY_TOOL_NAME;
  const systemPrompt = createSystemPrompt({ toolName: name });
  const toolDescription = createToolDescription({ toolName: name });
  const executor = createMemoryExecutor({ storage });
  return {
    name,
    systemPrompt,
    toolDescription,
    toolJsonSchema: createToolJsonSchema(),
    execute: executor,
  };
};
