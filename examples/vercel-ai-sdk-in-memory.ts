import "dotenv/config";
import { generateText, jsonSchema, stepCountIs } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createMemoryTool } from "@neutree-ai/memory";
import { InMemoryStorage } from "@neutree-ai/memory-storage-in-memory";

const openai = createOpenAICompatible({
  name: "openai",
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL ?? "",
});

const openaiModel = openai(process.env.MODEL ?? "gpt-4o-mini");

async function main(): Promise<void> {
  const storage = new InMemoryStorage();
  const memoryKit = createMemoryTool({
    storage,
  });

  const result = await generateText({
    model: openaiModel,
    system: memoryKit.systemPrompt,
    prompt: "Draft a feature roadmap and keep meeting notes along the way.",
    tools: {
      [memoryKit.name]: {
        description: memoryKit.toolDescription,
        inputSchema: jsonSchema(memoryKit.toolJsonSchema),
        execute: memoryKit.execute,
      },
    },
    stopWhen: stepCountIs(10),
  });

  for (const step of result.steps ?? []) {
    if (step.toolCalls) {
      for (const toolCall of step.toolCalls) {
        console.log(`Tool call (${toolCall.toolCallId})`, toolCall.input);
      }
    }
  }

  if (result.text) {
    console.log("Assistant:", result.text);
  }

  console.log("Memories stored in-memory (ephemeral)");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
