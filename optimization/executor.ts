import { generateText, jsonSchema, tool, stepCountIs } from "ai";
import type { LanguageModel, ToolCallPart } from "ai";
import type { DatasetItem, PromptCandidate } from "./types.js";
import type { MemoryToolKit } from "../src/index.js";
import { log } from "./utils.js";

export interface ExecutorOptions {
  model: LanguageModel;
  memoryToolKit: MemoryToolKit;
  verbose?: boolean;
}

export class DatasetExecutor {
  private currentSystemPrompt: string;
  private currentToolDescription: string;

  constructor(private options: ExecutorOptions) {
    // Use default prompts from the kit
    this.currentSystemPrompt = options.memoryToolKit.systemPrompt;
    this.currentToolDescription = options.memoryToolKit.toolDescription;
  }

  async executeDataset(dataset: DatasetItem[]): Promise<ToolCallPart[][]> {
    const results: ToolCallPart[][] = [];

    for (let i = 0; i < dataset.length; i++) {
      const item = dataset[i];
      if (this.options.verbose) {
        log.progress(`Executing ${i + 1}/${dataset.length}: ${item.id}`);
      }

      try {
        const toolCalls = await this.executeItem(item);
        results.push(toolCalls);

        if (this.options.verbose) {
          if (toolCalls.length > 0) {
            const commands = toolCalls.map((tc) => {
              const args = JSON.parse(tc.input as string);
              return args.command;
            });
            log.debug(
              `  → ${toolCalls.length} call(s): ${commands.join(" → ")}`,
            );
          } else {
            log.debug("  → No tool call");
          }
        }
      } catch (error) {
        log.error(`  ✗ Failed to execute item ${item.id}: ${error}`);
        results.push([]); // Empty result for failed execution
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    return results;
  }

  private async executeItem(item: DatasetItem): Promise<ToolCallPart[]> {
    const { messages } = item;

    const kit = this.options.memoryToolKit;

    const result = await generateText({
      model: this.options.model,
      system: this.currentSystemPrompt,
      messages,
      tools: {
        [kit.name]: tool({
          description: this.currentToolDescription,
          inputSchema: jsonSchema(kit.toolJsonSchema),
          execute: kit.execute,
        }),
      },
      stopWhen: stepCountIs(10), // Allow multiple steps like Haiku
    });

    // Collect ALL tool calls from all steps
    const allToolCalls: ToolCallPart[] = [];

    if (result.response?.messages) {
      for (const message of result.response.messages) {
        if (message.role === "assistant" && message.content) {
          for (const part of message.content) {
            if (typeof part !== "string" && part.type === "tool-call") {
              allToolCalls.push({
                type: "tool-call" as const,
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                input:
                  typeof part.input === "string"
                    ? part.input
                    : JSON.stringify(part.input),
              });
            }
          }
        }
      }
    }

    return allToolCalls;
  }

  async executeWithCandidate(
    dataset: DatasetItem[],
    candidate: PromptCandidate,
  ): Promise<ToolCallPart[][]> {
    // Temporarily update prompts
    const originalSystemPrompt = this.currentSystemPrompt;
    const originalToolDescription = this.currentToolDescription;

    this.currentSystemPrompt = candidate.system_prompt;
    this.currentToolDescription = candidate.tool_description;

    try {
      return await this.executeDataset(dataset);
    } finally {
      // Restore original prompts
      this.currentSystemPrompt = originalSystemPrompt;
      this.currentToolDescription = originalToolDescription;
    }
  }

  // Update prompts (useful for optimization)
  setPrompts(systemPrompt: string, toolDescription: string) {
    this.currentSystemPrompt = systemPrompt;
    this.currentToolDescription = toolDescription;
  }
}

export function createExecutor(
  model: LanguageModel,
  memoryToolKit: MemoryToolKit,
  verbose = false,
): DatasetExecutor {
  return new DatasetExecutor({
    model,
    memoryToolKit,
    verbose,
  });
}
