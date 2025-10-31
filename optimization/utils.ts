import type { ToolCallPart } from "ai";
import type { Dataset } from "./types.js";
import { randomUUID } from "node:crypto";

export function generateId(prefix = ""): string {
  const uuid = randomUUID();
  return prefix ? `${prefix}_${uuid}` : uuid;
}

export function splitDataset(
  dataset: Dataset,
  trainRatio = 0.8,
): [Dataset, Dataset] {
  const shuffled = [...dataset.items].sort(() => Math.random() - 0.5);
  const splitIndex = Math.floor(shuffled.length * trainRatio);

  const trainItems = shuffled.slice(0, splitIndex);
  const valItems = shuffled.slice(splitIndex);

  const trainDataset: Dataset = {
    ...dataset,
    items: trainItems,
    metadata: {
      ...dataset.metadata,
      name: `${dataset.metadata.name}_train`,
      total_items: trainItems.length,
    },
  };

  const valDataset: Dataset = {
    ...dataset,
    items: valItems,
    metadata: {
      ...dataset.metadata,
      name: `${dataset.metadata.name}_val`,
      total_items: valItems.length,
    },
  };

  return [trainDataset, valDataset];
}

export function filterDatasetByCategory(
  dataset: Dataset,
  category: string,
): Dataset {
  return {
    ...dataset,
    items: dataset.items.filter((item) => item.metadata?.category === category),
    metadata: {
      ...dataset.metadata,
      name: `${dataset.metadata.name}_${category}`,
      total_items: dataset.items.filter(
        (item) => item.metadata?.category === category,
      ).length,
    },
  };
}

export function safeJsonParse<T = unknown>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString);
  } catch {
    return fallback;
  }
}

// biome-ignore lint: by design
export function objectSimilarity(obj1: any, obj2: any): number {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  const commonKeys = keys1.filter((k) => keys2.includes(k));
  if (commonKeys.length === 0) return 0;

  let matches = 0;
  for (const key of commonKeys) {
    if (deepEqual(obj1[key], obj2[key])) {
      matches++;
    }
  }

  const avgKeys = (keys1.length + keys2.length) / 2;
  return matches / avgKeys;
}

// biome-ignore lint: by design
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (typeof a !== typeof b) return false;

  if (typeof a !== "object" || a === null || b === null) {
    return false;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}

// biome-ignore lint: by design
export function extractToolParams(toolCall: ToolCallPart): any {
  return safeJsonParse(toolCall.input as string, {});
}

export function compareToolCalls(
  expected: ToolCallPart,
  actual: ToolCallPart,
): {
  nameMatch: boolean;
  paramSimilarity: number;
  paramMatch: boolean;
} {
  const nameMatch = expected.toolName === actual.toolName;

  const expectedParams = extractToolParams(expected);
  const actualParams = extractToolParams(actual);

  const paramSimilarity = objectSimilarity(expectedParams, actualParams);
  const paramMatch = deepEqual(expectedParams, actualParams);

  return { nameMatch, paramSimilarity, paramMatch };
}

export function fuzzyMatch(str1: string, str2: string): boolean {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  return s1.includes(s2) || s2.includes(s1);
}

export function editDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1)
    .fill(0)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + 1,
        );
      }
    }
  }

  return dp[m][n];
}

export function stringSimilarity(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;

  const distance = editDistance(str1, str2);
  return 1 - distance / maxLen;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function getTimestamp(): string {
  return new Date().toISOString();
}

export function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

export function median(numbers: number[]): number {
  if (numbers.length === 0) return 0;

  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

export function standardDeviation(numbers: number[]): number {
  if (numbers.length === 0) return 0;

  const avg = average(numbers);
  const squareDiffs = numbers.map((n) => (n - avg) ** 2);
  const avgSquareDiff = average(squareDiffs);

  return Math.sqrt(avgSquareDiff);
}

export const log = {
  info: (msg: string) => console.log(`ℹ️  ${msg}`),
  success: (msg: string) => console.log(`✅ ${msg}`),
  error: (msg: string) => console.log(`❌ ${msg}`),
  warn: (msg: string) => console.log(`⚠️  ${msg}`),
  debug: (msg: string) => console.log(`🔍 ${msg}`),
  progress: (msg: string) => console.log(`⏳ ${msg}`),
};
