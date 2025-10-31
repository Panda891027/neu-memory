import { generateText } from "ai";
import type { LanguageModel } from "ai";
import type { PromptCandidate, ErrorAnalysis, DatasetItem } from "./types.js";
import { generateId, safeJsonParse } from "./utils.js";

export interface PromptGeneratorOptions {
  model: LanguageModel;
  temperature?: number;
}

export class PromptGenerator {
  constructor(private options: PromptGeneratorOptions) {}

  async generateCandidates(
    baseCandidate: PromptCandidate | null,
    errorAnalysis: ErrorAnalysis | null,
    count: number,
  ): Promise<PromptCandidate[]> {
    const candidates: PromptCandidate[] = [];

    for (let i = 0; i < count; i++) {
      const candidate = await this.generateSingleCandidate(
        baseCandidate,
        errorAnalysis,
        i,
      );
      candidates.push(candidate);
    }

    return candidates;
  }

  private async generateSingleCandidate(
    baseCandidate: PromptCandidate | null,
    errorAnalysis: ErrorAnalysis | null,
    iteration: number,
  ): Promise<PromptCandidate> {
    const prompt = this.buildGenerationPrompt(
      baseCandidate,
      errorAnalysis,
      iteration,
    );

    const { text } = await generateText({
      model: this.options.model,
      temperature: this.options.temperature ?? 0.8,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Parse the generated prompts
    const parsed = this.parseGeneratedPrompts(text);

    return {
      id: generateId("candidate"),
      system_prompt: parsed.systemPrompt,
      tool_description: parsed.toolDescription,
      score: 0, // Will be evaluated later
      generation_reasoning: parsed.reasoning,
    };
  }

  private buildGenerationPrompt(
    baseCandidate: PromptCandidate | null,
    errorAnalysis: ErrorAnalysis | null,
    iteration: number,
  ): string {
    let prompt = `You are a prompt optimization expert. Your task is to ${baseCandidate ? "IMPROVE EXISTING" : "CREATE NEW"} prompts for a memory tool system.

**Context:**
The memory tool allows an AI assistant to persist information across conversations using commands: view, create, str_replace, insert, delete, rename.
`;

    if (baseCandidate) {
      prompt += `
**Your Task:**
IMPROVE the following prompts by fixing identified issues while KEEPING the good parts.
- DO NOT start from scratch
- PRESERVE what's working well
- FIX specific problems identified in error analysis
- Make TARGETED improvements, not complete rewrites

**Current Best Prompts (Score: ${baseCandidate.score.toFixed(1)}%):**

SYSTEM PROMPT:
\`\`\`
${baseCandidate.system_prompt}
\`\`\`

TOOL DESCRIPTION:
\`\`\`
${baseCandidate.tool_description}
\`\`\`
`;
    } else {
      prompt += `
**Your Task:**
CREATE initial prompts from scratch:
1. A SYSTEM PROMPT injected into the assistant's conversation
2. A TOOL DESCRIPTION that explains the memory tool to the assistant

**Requirements:**
- The system prompt should guide when and how to use the memory tool
- The tool description should clearly explain each command and its parameters
- Balance between being too aggressive (calling tool unnecessarily) and too passive (missing important saves)
`;
    }

    if (errorAnalysis) {
      prompt += `\n**Error Analysis:**
${errorAnalysis.summary}

Key Issues:
- False Positives: ${errorAnalysis.false_positives.length} (tool called when it shouldn't be)
- False Negatives: ${errorAnalysis.false_negatives.length} (tool not called when it should be)
- Parameter Errors: ${errorAnalysis.parameter_errors.length} (wrong parameters passed)
`;

      // Dynamic strategy based on error analysis
      prompt += `\n**Improvement Strategy:**
`;

      if (errorAnalysis.false_positives.length > 0) {
        prompt += `
- Add clearer guidelines about when NOT to use the tool (too many false positives)
- Examples of scenarios that DON'T need memory: casual questions, general knowledge, one-off tasks`;
      }

      if (errorAnalysis.false_negatives.length > 0) {
        prompt += `
- Emphasize scenarios that REQUIRE memory (missing ${errorAnalysis.false_negatives.length} calls)
- Make it clearer when to save: explicit requests, multi-session work, important information`;
      }

      if (errorAnalysis.parameter_errors.length > 0) {
        prompt += `
- Improve parameter accuracy with more detailed examples (${errorAnalysis.parameter_errors.length} param errors)
- Show correct command usage patterns`;
      }
    } else {
      // No error analysis, use generic strategies
      prompt += `\n**Variation Strategy #${iteration + 1}:**
`;
      const strategies = [
        "Focus on clarity: make it obvious when to call vs not call the tool",
        "Focus on precision: ensure correct parameters are used for each command",
        "Focus on balance: avoid being too aggressive or too passive",
        "Try a different approach: experiment with tone, structure, or emphasis",
      ];
      prompt += strategies[iteration % strategies.length];
    }

    prompt += `\n\n**Output Format:**
Provide your response in this EXACT format:

REASONING:
[Your analysis and reasoning for this variation]

SYSTEM_PROMPT:
[The complete system prompt - can span multiple lines]

TOOL_DESCRIPTION:
[The complete tool description - can span multiple lines]
`;

    return prompt;
  }

  private parseGeneratedPrompts(text: string): {
    systemPrompt: string;
    toolDescription: string;
    reasoning: string;
  } {
    // Extract sections using markers
    const reasoningMatch = text.match(
      /REASONING:\s*([\s\S]*?)(?=SYSTEM_PROMPT:)/,
    );
    const systemPromptMatch = text.match(
      /SYSTEM_PROMPT:\s*([\s\S]*?)(?=TOOL_DESCRIPTION:)/,
    );
    const toolDescriptionMatch = text.match(/TOOL_DESCRIPTION:\s*([\s\S]*?)$/);

    const reasoning = reasoningMatch?.[1]?.trim() || "No reasoning provided";
    const systemPrompt =
      systemPromptMatch?.[1]?.trim() ||
      "You are a helpful assistant with memory capabilities.";
    const toolDescription =
      toolDescriptionMatch?.[1]?.trim() || "Manage memory files.";

    return {
      reasoning,
      systemPrompt,
      toolDescription,
    };
  }

  // Generate initial candidates without any base
  async generateInitialCandidates(count: number): Promise<PromptCandidate[]> {
    return this.generateCandidates(null, null, count);
  }
}

export function createPromptGenerator(
  model: LanguageModel,
  temperature = 0.8,
): PromptGenerator {
  return new PromptGenerator({ model, temperature });
}
