# 008 Implementation Plan

Each phase is independently testable. Do not start the next phase until the previous phase's focused checks pass.

## Phase 0: repository foundation

- initialize git
- add `AGENTS.md`
- add specs
- add `.gitignore`
- add a minimal `package.json` test script if needed
- record the baseline extension smoke test

Exit criteria:

- Pi can load the current extension
- specs are present
- working tree contains only intentional files

## Phase 1: pure policy and config modules

Files:

- `src/types.ts`
- `src/config.ts`
- `src/policy.ts`
- `src/brief.ts`

Tasks:

1. Define fixed modes, tools, slots, styles, and limits types.
2. Define defaults.
3. Parse and validate versioned JSON.
4. Load global/project mode config.
5. Resolve fixed mode behavior.
6. Implement brief generation as pure functions.

Tests:

- valid/invalid config
- precedence
- mode behavior
- every brief classification

## Phase 2: native tool adapter

Tasks:

1. Build native definitions with Pi factories.
2. Preserve native metadata and renderer references.
3. Delegate execution using the active `ctx.cwd`.
4. Preserve `prepareArguments` and `renderShell`.

Tests:

- all seven tools are registered
- schemas and prompt metadata remain available
- execution results match native results
- edit result details retain diff/patch/firstChangedLine

## Phase 3: native decorator components

Tasks:

1. Delegate native call/result rendering.
2. Preserve `lastComponent`, `state`, and invalidate.
3. Add full/partial/highlight/compact/brief/hidden rendering behavior.
4. Clip visual lines rather than raw ANSI/source text.
5. Preserve native code/diff colors.
6. Implement true hidden rendering without an empty shell.

Tests:

- full returns native output unchanged
- partial/compact limit correctly
- hidden returns zero visible lines
- invalidate propagates
- narrow terminal output remains valid

## Phase 4: lifecycle controller

Tasks:

1. Subscribe to Pi lifecycle/tool events.
2. Track active calls by ID.
3. Keep collapse rows native/visible during execution, then hide them at agent-settled.
4. Generate one aggregate summary at agent-settled.
5. Rerender existing rows after transitions.
6. Clean up on session shutdown.

Tests:

- sequential tools
- parallel tools
- late events
- retry/settle sequence
- collapse transition
- no state leakage between sessions

## Phase 5: mode integration

Tasks:

1. Connect the mode resolver to decorators.
2. Implement fixed visible/compact/collapse/hidden behavior.
3. Add mode selection state.

Tests:

- policy assertions for every mode and tool
- compact shows result summaries but never verbose result bodies
- hidden leaves no row

## Phase 6: configuration loading

Tasks:

1. Load global/project JSON.
2. Respect trust and Pi config paths.
3. Validate and normalize.
4. Add safe fallback and warning notification.

Tests:

- missing files
- malformed JSON
- project-over-global precedence
- unsupported schema version

## Phase 7: `/briefly` UI

Tasks:

1. Add the mode selector.
2. Add show/reload/reset subcommands.
3. Persist atomically.

Tests:

- command discovery
- non-interactive safety
- cancel leaves config unchanged
- confirm writes expected JSON
- reload applies configuration

## Phase 8: integration and migration cleanup

Tasks:

1. Remove old fixed renderer helpers.
2. Restore native write/read/edit behavior for full mode.
3. Add large edit smart collapse.
4. Verify bash streaming and images.
5. Update README/spec status.

## Phase 9: final validation

Run:

- unit tests
- full Pi JSON smoke test
- all seven tools
- success/error/partial flows
- TUI manual matrix
- narrow/wide terminal checks
- Ctrl+O checks
- git diff and status review
