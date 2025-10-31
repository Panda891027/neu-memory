import type {
  DatasetItem,
  ExpectedOutput,
  ScoringWeights,
  ComparisonResult,
  DetailedScore,
  ErrorAnalysis,
} from "./types.js";

import {
  extractToolParams,
  objectSimilarity,
  deepEqual,
  fuzzyMatch,
  average,
} from "./utils.js";

import {
  DEFAULT_SCORING_WEIGHTS,
  MEMORY_TOOL_KEY_FIELDS,
} from "./constants.js";
import type { ToolCallPart } from "ai";

export class MemoryToolScorer {
  constructor(private weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS) {
    const sum =
      this.weights.call_decision +
      this.weights.tool_name +
      this.weights.parameters;
    if (Math.abs(sum - 1) > 0.01) {
      throw new Error(`Scoring weights must sum to 1, got ${sum}`);
    }
  }

  score(expected: ExpectedOutput, actual: ToolCallPart[]): ComparisonResult {
    const errors: string[] = [];
    let score = 0;

    const expectedCall = expected.type === "tool_calls";
    const actualCall = actual.length > 0;

    const callMatch = expectedCall === actualCall;

    if (callMatch) {
      score += this.weights.call_decision * 100;
    } else {
      if (expectedCall && !actualCall) {
        errors.push("False negative: should call tool but did not");
      } else {
        errors.push("False positive: should not call tool but did");
      }
    }

    let toolNameMatch = false;
    let paramSimilarity = 0;

    if (expectedCall && actualCall && expected.tool_calls && actual) {
      const result = this.compareToolCallsDetailed(expected.tool_calls, actual);

      toolNameMatch = result.toolNameMatch;
      paramSimilarity = result.paramSimilarity;

      if (toolNameMatch) {
        score += this.weights.tool_name * 100;
      } else {
        errors.push(
          `Tool name mismatch: expected "${expected.tool_calls[0]?.toolName}", got "${actual[0]?.toolName}"`,
        );
      }

      score += this.weights.parameters * 100 * paramSimilarity;

      if (paramSimilarity < 1) {
        errors.push(
          `Parameter similarity: ${(paramSimilarity * 100).toFixed(1)}%`,
        );
      }
    } else if (expectedCall && actualCall) {
      errors.push("Tool calls data missing");
    } else if (!expectedCall && !actualCall) {
      score += (this.weights.tool_name + this.weights.parameters) * 100;
    }

    return {
      score,
      call_match: callMatch,
      tool_name_match: toolNameMatch,
      param_similarity: paramSimilarity,
      errors,
    };
  }

  private compareToolCallsDetailed(
    expected: ToolCallPart[],
    actual: ToolCallPart[],
  ): {
    toolNameMatch: boolean;
    paramSimilarity: number;
  } {
    if (expected.length === 0 || actual.length === 0) {
      return { toolNameMatch: false, paramSimilarity: 0 };
    }

    const expectedCall = expected[0];
    const actualCall = actual[0];

    const toolNameMatch = expectedCall.toolName === actualCall.toolName;

    const paramSimilarity = this.compareParameters(
      expectedCall.input as string,
      actualCall.input as string,
    );

    return { toolNameMatch, paramSimilarity };
  }

  private compareParameters(expectedJson: string, actualJson: string): number {
    const expectedParams = extractToolParams({
      toolCallId: "",
      type: "tool-call",
      toolName: "",
      input: expectedJson,
    });
    const actualParams = extractToolParams({
      toolCallId: "",
      type: "tool-call",
      toolName: "",
      input: actualJson,
    });

    if (deepEqual(expectedParams, actualParams)) {
      return 1;
    }

    const action = expectedParams.action;
    const keyFields =
      MEMORY_TOOL_KEY_FIELDS[action as keyof typeof MEMORY_TOOL_KEY_FIELDS] ||
      [];

    if (keyFields.length === 0) {
      return objectSimilarity(expectedParams, actualParams);
    }

    let matches = 0;
    let totalFields = 0;

    for (const field of keyFields) {
      totalFields++;
      const expectedValue = expectedParams[field];
      const actualValue = actualParams[field];

      if (expectedValue === undefined && actualValue === undefined) {
        matches++;
        continue;
      }

      if (expectedValue === undefined || actualValue === undefined) {
        continue;
      }

      if (this.compareFieldValue(expectedValue, actualValue)) {
        matches++;
      } else {
        const partialScore = this.partialMatchScore(expectedValue, actualValue);
        matches += partialScore;
      }
    }

    return totalFields > 0 ? matches / totalFields : 0;
  }

  // biome-ignore lint: by design
  private compareFieldValue(expected: any, actual: any): boolean {
    if (expected === actual) return true;

    if (typeof expected !== typeof actual) return false;

    if (typeof expected === "string" && typeof actual === "string") {
      return fuzzyMatch(expected, actual);
    }

    if (typeof expected === "object" && expected !== null && actual !== null) {
      return deepEqual(expected, actual);
    }

    return false;
  }

  // biome-ignore lint: by design
  private partialMatchScore(expected: any, actual: any): number {
    if (typeof expected === "string" && typeof actual === "string") {
      const exp = expected.toLowerCase();
      const act = actual.toLowerCase();

      const expWords = exp.split(/\s+/);
      const actWords = act.split(/\s+/);
      const commonWords = expWords.filter((w) => actWords.includes(w));

      if (commonWords.length > 0) {
        return commonWords.length / Math.max(expWords.length, actWords.length);
      }
    }

    return 0;
  }

  evaluateDataset(
    dataset: DatasetItem[],
    actualOutputs: ToolCallPart[][],
  ): DetailedScore {
    if (dataset.length !== actualOutputs.length) {
      throw new Error("Dataset and outputs length mismatch");
    }

    const perItemScores = dataset.map((item, index) => {
      const result = this.score(item.expected_output, actualOutputs[index]);
      return {
        item_id: item.id,
        score: result.score,
        errors: result.errors,
      };
    });

    const scores = perItemScores.map((s) => s.score);
    const averageScore = average(scores);

    let correctCalls = 0;
    let totalCalls = 0;
    let correctParams = 0;
    let totalParams = 0;
    let falsePositives = 0;
    let falseNegatives = 0;

    dataset.forEach((item, index) => {
      const result = this.score(item.expected_output, actualOutputs[index]);
      totalCalls++;

      if (result.call_match) {
        correctCalls++;
      } else {
        if (item.expected_output.type === "tool_calls") {
          falseNegatives++;
        } else {
          falsePositives++;
        }
      }

      if (
        item.expected_output.type === "tool_calls" &&
        actualOutputs[index] &&
        actualOutputs[index].length > 0
      ) {
        totalParams++;
        if (result.param_similarity > 0.9) {
          correctParams++;
        }
      }
    });

    return {
      average_score: averageScore,
      call_accuracy: correctCalls / totalCalls,
      param_accuracy: totalParams > 0 ? correctParams / totalParams : 1,
      false_positives: falsePositives,
      false_negatives: falseNegatives,
      per_item_scores: perItemScores,
    };
  }

  analyzeErrors(
    dataset: DatasetItem[],
    actualOutputs: ToolCallPart[][],
  ): ErrorAnalysis {
    const falsePositives: ErrorAnalysis["false_positives"] = [];
    const falseNegatives: ErrorAnalysis["false_negatives"] = [];
    const parameterErrors: ErrorAnalysis["parameter_errors"] = [];

    dataset.forEach((item, index) => {
      const expected = item.expected_output;
      const actual = actualOutputs[index];
      const result = this.score(expected, actual);

      if (expected.type === "no_tool_call" && actual && actual.length > 0) {
        falsePositives.push({
          item_id: item.id,
          messages: item.messages,
          actual_call: actual[0],
        });
      }

      if (expected.type === "tool_calls" && (!actual || actual.length === 0)) {
        falseNegatives.push({
          item_id: item.id,
          messages: item.messages,
          expected_call: expected.tool_calls[0],
        });
      }

      if (
        expected.type === "tool_calls" &&
        actual &&
        actual.length > 0 &&
        result.param_similarity < 0.9
      ) {
        const expectedParams = extractToolParams(expected.tool_calls[0]);
        const actualParams = extractToolParams(actual[0]);

        parameterErrors.push({
          item_id: item.id,
          messages: item.messages,
          expected_params: expectedParams,
          actual_params: actualParams,
          diff: this.generateParamDiff(expectedParams, actualParams),
        });
      }
    });

    const summary = this.generateErrorSummary(
      falsePositives,
      falseNegatives,
      parameterErrors,
      dataset.length,
    );

    return {
      false_positives: falsePositives,
      false_negatives: falseNegatives,
      parameter_errors: parameterErrors,
      summary,
    };
  }

  // biome-ignore lint: by design
  private generateParamDiff(expected: any, actual: any): string {
    const diffs: string[] = [];

    const allKeys = new Set([...Object.keys(expected), ...Object.keys(actual)]);

    for (const key of allKeys) {
      const expVal = expected[key];
      const actVal = actual[key];

      if (expVal === undefined) {
        diffs.push(`  + ${key}: ${JSON.stringify(actVal)} (unexpected)`);
      } else if (actVal === undefined) {
        diffs.push(`  - ${key}: ${JSON.stringify(expVal)} (missing)`);
      } else if (!deepEqual(expVal, actVal)) {
        diffs.push(
          `  ~ ${key}: ${JSON.stringify(expVal)} -> ${JSON.stringify(actVal)}`,
        );
      }
    }

    return diffs.length > 0 ? diffs.join("\n") : "No differences";
  }

  private generateErrorSummary(
    // biome-ignore lint: by design
    falsePositives: any[],
    // biome-ignore lint: by design
    falseNegatives: any[],
    // biome-ignore lint: by design
    parameterErrors: any[],
    totalItems: number,
  ): string {
    const lines: string[] = [];

    lines.push(`Total items: ${totalItems}`);
    lines.push(
      `False positives: ${falsePositives.length} (${((falsePositives.length / totalItems) * 100).toFixed(1)}%)`,
    );
    lines.push(
      `False negatives: ${falseNegatives.length} (${((falseNegatives.length / totalItems) * 100).toFixed(1)}%)`,
    );
    lines.push(
      `Parameter errors: ${parameterErrors.length} (${((parameterErrors.length / totalItems) * 100).toFixed(1)}%)`,
    );

    if (falsePositives.length > 0) {
      lines.push("\nFalse Positive Patterns:");
      lines.push("- Model is calling tool when it should not");
      lines.push("- Common in: general questions, casual conversation");
    }

    if (falseNegatives.length > 0) {
      lines.push("\nFalse Negative Patterns:");
      lines.push("- Model is not calling tool when it should");
      lines.push("- Common in: implicit save/retrieve requests");
    }

    if (parameterErrors.length > 0) {
      lines.push("\nParameter Error Patterns:");

      const fieldErrors = new Map<string, number>();
      for (const err of parameterErrors) {
        const allKeys = new Set([
          ...Object.keys(err.expected_params),
          ...Object.keys(err.actual_params),
        ]);
        for (const key of allKeys) {
          if (!deepEqual(err.expected_params[key], err.actual_params[key])) {
            fieldErrors.set(key, (fieldErrors.get(key) || 0) + 1);
          }
        }
      }

      const sortedFields = Array.from(fieldErrors.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      for (const [field, count] of sortedFields) {
        lines.push(`- Field "${field}": ${count} errors`);
      }
    }

    return lines.join("\n");
  }

  updateWeights(weights: Partial<ScoringWeights>): void {
    this.weights = { ...this.weights, ...weights };

    const sum =
      this.weights.call_decision +
      this.weights.tool_name +
      this.weights.parameters;
    if (Math.abs(sum - 1) > 0.01) {
      throw new Error(`Scoring weights must sum to 1, got ${sum}`);
    }
  }
}
