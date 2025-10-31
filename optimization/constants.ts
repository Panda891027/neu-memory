import type { ScoringWeights, OptimizerConfig } from "./types.js";
import type { MEMORY_COMMANDS } from "../src/index.js";

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  call_decision: 0.4,
  tool_name: 0.2,
  parameters: 0.4,
};

export const DEFAULT_OPTIMIZER_CONFIG: Partial<OptimizerConfig> = {
  iterations: 5,
  candidates_per_iteration: 3,
  scoring_weights: DEFAULT_SCORING_WEIGHTS,
  early_stopping_threshold: 95,
  use_validation_split: false,
  validation_ratio: 0.2,
};

export const MEMORY_TOOL_KEY_FIELDS: Record<
  (typeof MEMORY_COMMANDS)[number],
  string[]
> = {
  view: ["path", "view_range"],
  create: ["path", "file_text"],
  str_replace: ["path", "old_str", "new_str"],
  insert: ["path", "insert_line", "insert_text"],
  delete: ["path"],
  rename: ["old_path", "new_path"],
};

export const SCORE_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 75,
  FAIR: 60,
  POOR: 0,
} as const;

export const LLM_DEFAULTS = {
  temperature: 0.7,
  max_tokens: 2000,
  optimizer_temperature: 0.8,
} as const;
