import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, stepCountIs } from "ai";
import { readFile, writeFile } from "node:fs/promises";
import { ProxyAgent, setGlobalDispatcher, fetch as customFetch } from "undici";
import type { Dataset, DatasetItem, ExpectedOutput } from "./types.js";
import { log } from "./utils.js";

// Setup proxy if needed
if (process.env.http_proxy) {
  setGlobalDispatcher(new ProxyAgent(process.env.http_proxy));
}

const anthropic = createAnthropic({
  fetch: customFetch as unknown as typeof fetch,
});

const haiku = anthropic("claude-haiku-4-5");

// Official memory tool from Anthropic
const memory = anthropic.tools.memory_20250818({
  execute: async (action) => {
    // Mock execution - we don't actually need to execute for dataset generation
    return JSON.stringify({ success: true, action });
  },
});

async function generateDatasetFromScenarios(
  scenariosPath: string,
  outputPath: string,
) {
  log.info(`Loading scenarios from ${scenariosPath}`);

  const scenariosContent = await readFile(scenariosPath, "utf-8");
  const scenariosData = JSON.parse(scenariosContent);
  scenariosData.scenarios = scenariosData.scenarios.slice(0, 3);

  log.info(`Found ${scenariosData.scenarios.length} scenarios`);

  const items: DatasetItem[] = [];

  for (let i = 0; i < scenariosData.scenarios.length; i++) {
    const scenario = scenariosData.scenarios[i];
    log.progress(
      `Processing scenario ${i + 1}/${scenariosData.scenarios.length}: ${scenario.id}`,
    );

    try {
      const result = await generateText({
        model: haiku,
        messages: scenario.messages,
        tools: {
          memory,
        },
        stopWhen: stepCountIs(10),
      });

      // Collect ALL tool calls from all steps
      const allToolCalls = [];

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

      // Convert toolCalls to expected output format
      let expectedOutput: ExpectedOutput;

      if (allToolCalls.length > 0) {
        expectedOutput = {
          type: "tool_calls",
          tool_calls: allToolCalls,
        };

        const commands = allToolCalls.map((tc) => {
          const input = JSON.parse(tc.input as string);
          return input.command;
        });
        log.debug(
          `  → ${allToolCalls.length} tool call(s): ${commands.join(" → ")}`,
        );
      } else {
        expectedOutput = {
          type: "no_tool_call",
        };
        log.debug("  → No tool call");
      }

      items.push({
        id: scenario.id,
        messages: scenario.messages,
        expected_output: expectedOutput,
        metadata: scenario.metadata,
      });
    } catch (error) {
      log.error(`  ✗ Failed to process scenario ${scenario.id}: ${error}`);
      // Continue with other scenarios
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Create dataset
  const dataset: Dataset = {
    metadata: {
      name: "haiku-generated-memory-tool-dataset",
      created_at: new Date().toISOString(),
      source_model: "claude-haiku-4-5",
      total_items: items.length,
    },
    items,
  };

  // Save dataset
  log.info(`Saving dataset to ${outputPath}`);
  await writeFile(outputPath, JSON.stringify(dataset, null, 2), "utf-8");

  log.success(`✓ Dataset generated successfully with ${items.length} items`);

  // Print summary
  const toolCallCount = items.filter(
    (item) => item.expected_output.type === "tool_calls",
  ).length;
  const noToolCallCount = items.length - toolCallCount;

  console.log("\n📊 Summary:");
  console.log(`  Total items: ${items.length}`);
  console.log(
    `  Tool calls: ${toolCallCount} (${((toolCallCount / items.length) * 100).toFixed(1)}%)`,
  );
  console.log(
    `  No tool calls: ${noToolCallCount} (${((noToolCallCount / items.length) * 100).toFixed(1)}%)`,
  );

  // Print by category
  const byCategory = new Map<string, number>();
  for (const item of items) {
    const category = item.metadata?.category || "unknown";
    byCategory.set(category, (byCategory.get(category) || 0) + 1);
  }

  console.log("\n📁 By category:");
  for (const [category, count] of Array.from(byCategory.entries()).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`  ${category}: ${count}`);
  }
}

// Main execution
const scenariosPath = new URL(
  "./datasets/input-scenarios.json",
  import.meta.url,
).pathname;
const outputPath = new URL(
  "./datasets/haiku-generated-dataset.json",
  import.meta.url,
).pathname;

generateDatasetFromScenarios(scenariosPath, outputPath).catch((error) => {
  log.error(`Fatal error: ${error}`);
  process.exit(1);
});
