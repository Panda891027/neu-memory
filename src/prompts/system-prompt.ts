import {
  DEFAULT_MEMORY_TOOL_NAME,
  type MemoryToolName,
} from "../types/commands.js";

export interface CreateSystemPromptOptions {
  readonly toolName?: MemoryToolName;
}

export const createSystemPrompt = (
  options: CreateSystemPromptOptions = {},
): string => {
  const toolName = options.toolName ?? DEFAULT_MEMORY_TOOL_NAME;
  return `IMPORTANT: ALWAYS VIEW YOUR MEMORY DIRECTORY BEFORE DOING ANYTHING ELSE.
MEMORY PROTOCOL:
1. Use the \`view\` command of your \`${toolName}\` tool to check for earlier progress.
2. ... (work on the task) ...
     - As you make progress, record status / progress / thoughts etc in your memory.
ASSUME INTERRUPTION: Your context window might be reset at any moment, so you risk losing any progress that is not recorded in your memory directory.`;
};
