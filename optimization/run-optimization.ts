import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { readFile, writeFile } from "node:fs/promises";
import { ProxyAgent, setGlobalDispatcher, fetch as customFetch } from "undici";
import { createMemoryTool } from "../src/index.js";
import { InMemoryStorage } from "../src/storage/in-memory.js";
import { createExecutor } from "./executor.js";
import { createPromptGenerator } from "./prompt-generator.js";
import { createOptimizer } from "./optimizer.js";
import type { Dataset } from "./types.js";
import { log } from "./utils.js";

// Setup proxy if needed
if (process.env.http_proxy) {
  setGlobalDispatcher(new ProxyAgent(process.env.http_proxy));
}

// Models setup

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL ?? "",
});

// Model A (Teacher) - for prompt generation
const teacher = openrouter("z-ai/glm-4.6");

// Model B (Open source model) - the target model to optimize for
const targetModel = openrouter("openai/gpt-oss-20b", {
  provider: {
    order: ["fireworks"],
  },
});

async function runOptimization() {
  log.info("🔧 Setting up optimization pipeline...\n");

  // 1. Load dataset
  const datasetPath = new URL(
    "./datasets/haiku-generated-dataset.json",
    import.meta.url,
  ).pathname;
  log.info(`Loading dataset from ${datasetPath}`);
  const datasetContent = await readFile(datasetPath, "utf-8");
  const dataset: Dataset = JSON.parse(datasetContent);
  log.success(`Loaded ${dataset.items.length} items from dataset\n`);

  // 2. Create memory tool kit
  const memoryToolKit = createMemoryTool({
    toolName: "memory",
    storage: new InMemoryStorage(),
  });
  log.success("Created memory tool kit\n");

  // 3. Create executor (runs dataset on target model B)
  const executor = createExecutor(
    targetModel,
    memoryToolKit,
    true, // verbose
  );
  log.success("Created dataset executor\n");

  // 4. Create prompt generator (uses Haiku to generate variations)
  const generator = createPromptGenerator(
    teacher,
    0.8, // temperature for creativity
  );
  log.success("Created prompt generator\n");

  // 5. Create optimizer
  const optimizer = createOptimizer(executor, generator, {
    iterations: 3, // Start with 3 iterations
    candidates_per_iteration: 2, // 2 candidates per iteration
    early_stopping_threshold: 95, // Stop if we reach 95% score
  });
  log.success("Created optimizer\n");

  // 6. Run optimization with baseline from memory kit
  log.info("=".repeat(60));
  const result = await optimizer.optimize(
    dataset,
    memoryToolKit.systemPrompt,
    memoryToolKit.toolDescription,
  );

  // 7. Save results
  const outputPath = new URL(
    "./results/optimization-result.json",
    import.meta.url,
  ).pathname;

  await writeFile(outputPath, JSON.stringify(result, null, 2), "utf-8");
  log.success(`\n💾 Results saved to ${outputPath}`);

  // Print best prompts
  const splitLine = `\n${"=".repeat(60)}\n`;
  console.log(splitLine);
  console.log("🏆 BEST PROMPTS:");
  console.log("=".repeat(60));
  console.log("\n📝 SYSTEM PROMPT:");
  console.log(result.best_candidate.system_prompt);
  console.log("\n🔧 TOOL DESCRIPTION:");
  console.log(result.best_candidate.tool_description);
  console.log("\n📊 SCORE:", `${result.best_candidate.score.toFixed(1)}%`);

  if (result.best_candidate.detailed_scores) {
    const ds = result.best_candidate.detailed_scores;
    console.log("\n📈 Detailed Metrics:");
    console.log(`  - Call Accuracy: ${(ds.call_accuracy * 100).toFixed(1)}%`);
    console.log(`  - Param Accuracy: ${(ds.param_accuracy * 100).toFixed(1)}%`);
    console.log(`  - False Positives: ${ds.false_positives}`);
    console.log(`  - False Negatives: ${ds.false_negatives}`);
  }

  console.log(splitLine);
}

// Run the optimization
runOptimization().catch((error) => {
  log.error(`Fatal error: ${error}`);
  console.error(error);
  process.exit(1);
});
