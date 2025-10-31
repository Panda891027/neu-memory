# Contributing to neu-memory

Thanks for your interest in improving neu-memory! Follow these steps to set up your environment and send changes:

1. Install dependencies with `yarn install`.
2. Run `yarn test` and `yarn lint` to ensure checks pass.
3. Open a pull request with a clear description of the problem and solution. Reference related issues when possible.

For larger ideas or roadmap suggestions, start a discussion or issue before writing code.

## Common contribution paths

- **Add a storage backend**
  1. Create a new file under `src/storage/` that implements the `Storage` interface.
  2. Add targeted tests in `tests/` to cover CRUD, list, and move scenarios.
  3. Document the backend in `README.md` under “Storage backends”.

- **Add a framework integration**
  1. Add a runnable example under `examples/frameworks/<framework-name>/`.
  2. Include a short README or inline comments describing how to run it.
  3. Link the example in the main README’s “Framework integrations” list.

- **Improve prompts**
  1. Modify `src/prompts/system-prompt.ts` or `src/prompts/tool-description.ts` with clearer instructions or better guardrails.
  2. Include before/after examples or evaluation notes in the pull request description so we know what changed.