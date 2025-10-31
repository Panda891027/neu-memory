import type {
  Dataset,
  OptimizerConfig,
  OptimizationResult,
  PromptCandidate,
} from "./types.js";
import type { DatasetExecutor } from "./executor.js";
import type { PromptGenerator } from "./prompt-generator.js";
import { MemoryToolScorer } from "./score.js";
import { log, getTimestamp, formatDuration, generateId } from "./utils.js";
import { DEFAULT_OPTIMIZER_CONFIG } from "./constants.js";

export class PromptOptimizer {
  private scorer: MemoryToolScorer;
  private executor: DatasetExecutor;
  private generator: PromptGenerator;
  private config: OptimizerConfig;

  constructor(
    executor: DatasetExecutor,
    generator: PromptGenerator,
    config: Partial<OptimizerConfig> = {},
  ) {
    this.executor = executor;
    this.generator = generator;
    this.config = { ...DEFAULT_OPTIMIZER_CONFIG, ...config } as OptimizerConfig;
    this.scorer = new MemoryToolScorer(this.config.scoring_weights);
  }

  async optimize(
    dataset: Dataset,
    baselineSystemPrompt?: string,
    baselineToolDescription?: string,
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    const startTimeStr = getTimestamp();

    log.info(`🚀 Starting optimization with ${dataset.items.length} items`);
    log.info(
      `Config: ${this.config.iterations} iterations × ${this.config.candidates_per_iteration} candidates`,
    );

    const allCandidates: PromptCandidate[] = [];
    const iterations: OptimizationResult["iterations"] = [];
    let bestCandidate: PromptCandidate | null = null;
    let totalEvaluations = 0;

    // Evaluate baseline if provided
    if (baselineSystemPrompt && baselineToolDescription) {
      log.info("\n📊 Evaluating baseline prompts from memory kit...");

      const baselineCandidate: PromptCandidate = {
        id: generateId("baseline"),
        system_prompt: baselineSystemPrompt,
        tool_description: baselineToolDescription,
        score: 0,
        generation_reasoning: "Baseline from memory kit default prompts",
      };

      try {
        const outputs = await this.executor.executeWithCandidate(
          dataset.items,
          baselineCandidate,
        );

        const detailedScore = this.scorer.evaluateDataset(dataset.items, outputs);
        baselineCandidate.score = detailedScore.average_score;
        baselineCandidate.detailed_scores = detailedScore;

        log.success(
          `Baseline score: ${baselineCandidate.score.toFixed(1)}% (call: ${(detailedScore.call_accuracy * 100).toFixed(0)}%, param: ${(detailedScore.param_accuracy * 100).toFixed(0)}%)`,
        );

        bestCandidate = baselineCandidate;
        allCandidates.push(baselineCandidate);
        totalEvaluations++;
      } catch (error) {
        log.error(`Failed to evaluate baseline: ${error}`);
      }
    }

    // Main optimization loop
    for (let iter = 0; iter < this.config.iterations; iter++) {
      log.info(`\n📊 Iteration ${iter + 1}/${this.config.iterations}`);

      // Generate candidates
      log.progress("Generating prompt candidates...");
      const errorAnalysis =
        bestCandidate && iter > 0
          ? await this.analyzeErrors(dataset, bestCandidate)
          : null;

      const candidates = await this.generator.generateCandidates(
        bestCandidate,
        errorAnalysis,
        this.config.candidates_per_iteration,
      );

      log.success(`Generated ${candidates.length} candidates`);

      // Evaluate each candidate
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        log.progress(`Evaluating candidate ${i + 1}/${candidates.length}...`);

        try {
          // Execute dataset with this candidate
          const outputs = await this.executor.executeWithCandidate(
            dataset.items,
            candidate,
          );

          // Score the outputs
          const detailedScore = this.scorer.evaluateDataset(
            dataset.items,
            outputs,
          );

          candidate.score = detailedScore.average_score;
          candidate.detailed_scores = detailedScore;

          log.success(
            `Candidate ${i + 1} score: ${candidate.score.toFixed(1)}% (call: ${(detailedScore.call_accuracy * 100).toFixed(0)}%, param: ${(detailedScore.param_accuracy * 100).toFixed(0)}%)`,
          );
        } catch (error) {
          log.error(`Failed to evaluate candidate ${i + 1}: ${error}`);
          candidate.score = 0;
        }

        totalEvaluations++;
        allCandidates.push(candidate);
      }

      // Find best candidate in this iteration
      const iterationBest = candidates.reduce((a, b) =>
        a.score > b.score ? a : b,
      );

      // Update global best
      if (!bestCandidate || iterationBest.score > bestCandidate.score) {
        const improvement = bestCandidate
          ? iterationBest.score - bestCandidate.score
          : iterationBest.score;
        log.success(
          `✨ New best score: ${iterationBest.score.toFixed(1)}% ${bestCandidate ? `(+${improvement.toFixed(1)}%)` : ""}`,
        );
        bestCandidate = iterationBest;
      } else {
        log.info(
          `No improvement. Best remains: ${bestCandidate.score.toFixed(1)}%`,
        );
      }

      iterations.push({
        iteration: iter + 1,
        best_score: iterationBest.score,
        candidates,
      });

      // Early stopping check
      if (
        this.config.early_stopping_threshold &&
        bestCandidate.score >= this.config.early_stopping_threshold
      ) {
        log.success(
          `🎯 Early stopping! Score ${bestCandidate.score.toFixed(1)}% reached threshold ${this.config.early_stopping_threshold}%`,
        );
        break;
      }
    }

    const endTime = Date.now();
    const endTimeStr = getTimestamp();
    const durationSeconds = (endTime - startTime) / 1000;

    if (!bestCandidate) {
      throw new Error("No candidates were evaluated successfully.");
    }

    log.success("\n✅ Optimization complete!");
    log.info(`Best score: ${bestCandidate.score.toFixed(1)}%`);
    log.info(`Total evaluations: ${totalEvaluations}`);
    log.info(`Duration: ${formatDuration(durationSeconds)}`);

    return {
      best_candidate: bestCandidate,
      all_candidates: allCandidates,
      iterations,
      metadata: {
        total_iterations: iterations.length,
        total_evaluations: totalEvaluations,
        start_time: startTimeStr,
        end_time: endTimeStr,
        duration_seconds: durationSeconds,
      },
    };
  }

  private async analyzeErrors(dataset: Dataset, candidate: PromptCandidate) {
    const outputs = await this.executor.executeWithCandidate(
      dataset.items,
      candidate,
    );
    return this.scorer.analyzeErrors(dataset.items, outputs);
  }
}

export function createOptimizer(
  executor: DatasetExecutor,
  generator: PromptGenerator,
  config: Partial<OptimizerConfig> = {},
): PromptOptimizer {
  return new PromptOptimizer(executor, generator, config);
}
