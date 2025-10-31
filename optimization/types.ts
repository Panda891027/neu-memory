import type { ModelMessage, ToolCallPart } from "ai";

export type ExpectedOutput =
  | { type: "no_tool_call" }
  | { type: "tool_calls"; tool_calls: ToolCallPart[] };

export type DatasetItem = {
  id: string;
  messages: ModelMessage[];
  expected_output: ExpectedOutput;
  metadata?: {
    description?: string;
    category?: string;
    difficulty?: "easy" | "medium" | "hard";
  };
};

export type Dataset = {
  items: DatasetItem[];
  metadata: {
    name: string;
    created_at: string;
    source_model: string;
    total_items: number;
  };
};

export type PromptCandidate = {
  id: string;
  system_prompt: string;
  tool_description: string;
  score: number;
  detailed_scores?: DetailedScore;
  generation_reasoning?: string;
};

export type DetailedScore = {
  average_score: number;
  call_accuracy: number;
  param_accuracy: number;
  false_positives: number;
  false_negatives: number;
  per_item_scores: Array<{
    item_id: string;
    score: number;
    errors: string[];
  }>;
};

export type ScoringWeights = {
  call_decision: number;
  tool_name: number;
  parameters: number;
};

export type ComparisonResult = {
  score: number;
  call_match: boolean;
  tool_name_match: boolean;
  param_similarity: number;
  errors: string[];
};

export type OptimizerConfig = {
  iterations: number;
  candidates_per_iteration: number;
  scoring_weights: ScoringWeights;
  early_stopping_threshold?: number;
  use_validation_split?: boolean;
  validation_ratio?: number;
};

export type OptimizationResult = {
  best_candidate: PromptCandidate;
  all_candidates: PromptCandidate[];
  iterations: Array<{
    iteration: number;
    best_score: number;
    candidates: PromptCandidate[];
  }>;
  metadata: {
    total_iterations: number;
    total_evaluations: number;
    start_time: string;
    end_time: string;
    duration_seconds: number;
  };
};

export type ErrorAnalysis = {
  false_positives: Array<{
    item_id: string;
    messages: ModelMessage[];
    actual_call: ToolCallPart;
  }>;
  false_negatives: Array<{
    item_id: string;
    messages: ModelMessage[];
    expected_call: ToolCallPart;
  }>;
  parameter_errors: Array<{
    item_id: string;
    messages: ModelMessage[];
    expected_params: unknown;
    actual_params: unknown;
    diff: string;
  }>;
  summary: string;
};
