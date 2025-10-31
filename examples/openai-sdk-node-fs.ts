import "dotenv/config";
import OpenAI from "openai";
import { createMemoryTool } from "@neutree-ai/memory";
import { NodeFileSystemStorage } from "@neutree-ai/memory/storage/node-fs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

async function main(): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required to run this example");
  }

  const storage = await NodeFileSystemStorage.init("./memory");
  const memoryKit = createMemoryTool({
    storage,
  });

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: memoryKit.systemPrompt },
    {
      role: "user",
      content: "Draft a feature roadmap and keep meeting notes along the way.",
    },
  ];

  const tools: OpenAI.Chat.ChatCompletionTool[] = [
    {
      type: "function",
      function: {
        name: memoryKit.name,
        description: memoryKit.toolDescription,
        parameters: memoryKit.toolJsonSchema,
      },
    },
  ];

  // Tool calling loop
  while (true) {
    const response = await openai.chat.completions.create({
      model: process.env.MODEL ?? "gpt-4o-mini",
      messages,
      tools,
    });

    const message = response.choices[0].message;
    messages.push(message);

    if (message.content) {
      console.log("Assistant:", message.content);
      break;
    }

    // Execute tool calls
    if (message.tool_calls) {
      for (const toolCall of message.tool_calls) {
        if (
          toolCall.type === "function" &&
          toolCall.function.name === memoryKit.name
        ) {
          const args = JSON.parse(toolCall.function.arguments);
          console.log(`Tool call (${toolCall.id}):`, args);
          const result = await memoryKit.execute(args);

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        }
      }
    }
  }

  console.log("Memories persisted under ./memory");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
