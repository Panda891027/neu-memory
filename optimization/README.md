# Memory Tool Prompt Optimization

MIPRO-inspired prompt optimization for migrating Anthropic's memory tool to open-source models.

## 🎯 Goal

Optimize two prompts to make open-source models behave like Claude Haiku with the official memory tool:
1. **System Prompt** - injected into the conversation
2. **Tool Description** - explains the memory tool

## 📁 Project Structure

```
optimization/
├── datasets/
│   ├── input-scenarios.json          # Hand-crafted input scenarios
│   └── haiku-generated-dataset.json  # Generated dataset with Haiku outputs
├── results/
│   └── optimization-result.json      # Optimization results
├── types.ts                          # TypeScript type definitions
├── constants.ts                      # Configuration constants
├── utils.ts                          # Utility functions
├── score.ts                          # Scoring system (MemoryToolScorer)
├── executor.ts                       # Dataset execution on target model
├── prompt-generator.ts               # LLM-powered prompt generation
├── optimizer.ts                      # Main optimization loop
├── generate-dataset.ts               # Script to generate dataset from Haiku
└── run-optimization.ts               # Main demo script
```

## 🚀 Usage

### Step 1: Generate Dataset

Generate expected outputs using Claude Haiku:

```bash
npx tsx optimization/generate-dataset.ts
```

This reads `input-scenarios.json` and generates `haiku-generated-dataset.json` with actual tool calls from Haiku.

### Step 2: Run Optimization

Optimize prompts for the target model:

```bash
npx tsx optimization/run-optimization.ts
```

This will:
1. Load the Haiku-generated dataset
2. Create an executor for the target model (open-source)
3. Use Haiku to generate prompt variations
4. Evaluate each variation against the dataset
5. Iterate to find the best prompts
6. Save results to `results/optimization-result.json`

## ⚙️ Configuration

Edit `run-optimization.ts` to configure:

```typescript
const optimizer = createOptimizer(executor, generator, {
  iterations: 3,                    // Number of optimization rounds
  candidates_per_iteration: 2,      // Candidates per round
  early_stopping_threshold: 95,     // Stop if score reaches this %
});
```

## 📊 Scoring System

Three-dimensional scoring (weights in `constants.ts`):
- **Call Decision (40%)**: Did the model correctly decide to call/not call the tool?
- **Tool Name (20%)**: Was the correct tool/command called?
- **Parameters (40%)**: Were the parameters correct?

## 🔧 Components

### MemoryToolScorer (`score.ts`)
- Compares expected vs actual tool calls
- Weighted scoring with parameter fuzzy matching
- Error analysis (false positives, false negatives, parameter errors)

### DatasetExecutor (`executor.ts`)
- Runs dataset on target model with given prompts
- Collects all tool calls from multi-step conversations
- Supports prompt swapping for candidate evaluation

### PromptGenerator (`prompt-generator.ts`)
- Uses LLM to generate prompt variations
- Analyzes error patterns from previous iterations
- Different strategies per iteration (reduce FP, reduce FN, etc.)

### PromptOptimizer (`optimizer.ts`)
- Main optimization loop
- Iterative improvement with error-driven generation
- Early stopping and progress tracking

## 📈 Output

Results include:
- Best system prompt and tool description
- Overall score and detailed metrics
- All candidates from all iterations
- Per-iteration statistics
- Error analysis

Example:
```json
{
  "best_candidate": {
    "system_prompt": "...",
    "tool_description": "...",
    "score": 85.5,
    "detailed_scores": {
      "call_accuracy": 0.9,
      "param_accuracy": 0.8,
      "false_positives": 1,
      "false_negatives": 0
    }
  }
}
```

## 🔄 Workflow

```
Input Scenarios → [Haiku] → Dataset
                              ↓
Dataset → [Target Model + Prompts] → Tool Calls
                                        ↓
                    Expected Calls ← Scorer → Actual Calls
                                        ↓
                                      Score
                                        ↓
                    Error Analysis → [LLM] → New Prompts
                                        ↓
                                    Iterate
```
