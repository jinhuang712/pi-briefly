# Changelog

All notable changes to `pi-briefly` are documented here.

## [0.2.0] - 2026-09-10

### Breaking changes

- Presentation presets (`visible`, `compact`, `collapse`, `hidden`) are gone. `pi-briefly` is now one switch: `/briefly` toggles terse mode on and off.
- Configuration is `{ "version": 2, "terse": boolean, "locale": ... }`. Files written by the previous design are reported once as removed `mode` configuration and otherwise ignored.
- The `/briefly` mode selector, per-tool style limits (`maxLines`, `maxChars`, `headLines`, `tailLines`, `thresholdLines`, `showCommand`, `showContent`, `showExpandHint`), collapse summaries, hidden-step summaries, and thinking condensation were removed. Thinking now renders natively (use Pi's `hideThinkingBlock`).

### Added

- Terse mode: every built-in tool call renders as a single gray line, `✓ read · 查看配置解析逻辑`, with `✗` and one clipped error line when the call fails.
- Per-call timing in front of the description, shown as the bare number: `(2.1s)` while the call runs, repainted once per second even when the tool prints nothing, then the final `(5.0s)`. Replayed rows show no timing instead of a fake `0.0s`.
- Typography carries the row hierarchy: bold tool name, italic timing and raw heuristic target, plain gray description.
- The model supplies the description: a required `brief` argument is added to the built-in tool schemas while terse mode is on, and one instruction line is appended to the system prompt.
- `prepareArguments` fills in a heuristic description when the model omits or blanks `brief`, so a missing description can neither fail the tool call nor leave an empty row, and older sessions stay replayable.
- Execution delegates to Pi's built-in tools with the display-only `brief` argument stripped before the native implementation runs.
- `Ctrl+O` renders expanded rows through Pi's native renderer.

### Changed

- The switch drives the tool schema as well as rendering: with terse mode off, tools are registered with their original schemas so the model is never asked for a description nobody displays.
- Terse rows skip the native box; native rows keep Pi's background, padding, and status colours.
- Added `npm run typecheck` (`tsconfig.json`, `typescript` and `@types/node` dev dependencies) and fixed the remaining type errors, so type regressions no longer slip past `node --experimental-strip-types`, which only strips types.

### Removed

- Turn timing is gone entirely: the `Took … spent tokens` entry, the live `Working...` indicator, and per-turn token accumulation. They duplicated the companion `pi-elapsed` extension, which owns turn timing, and a turn could render two `Took` lines. `pi-briefly` now only measures the individual tool call its row describes.
- `src/lifecycle.ts` (settled-state folding and run statistics) and `src/thinking.ts` (thinking condensation), along with their tests.

### Fixed

- Flipping the switch now rebuilds the tool rows that are already on screen. Pi exposes no transcript-refresh hook (`setHiddenThinkingLabel` only touches thinking blocks), so the tool-expansion state is re-applied and restored within the same tick, and the caller's notification replaces its transient status message. The refresh is skipped on session start, where there is nothing to rebuild and it would leave a stray `Tool output: collapsed` status behind.
- A tool row keeps the pending mark (`·`) and streams the description as the model produces it; a partial result arriving mid-execution no longer flips the row to `✓` before the call completes.
- Heuristic descriptions separate the purpose from the raw command or path with `›`; they used to be joined by a space and read as one sentence.
### Verification

- Unit tests: 34 passing, covering the switch policy, the `brief` contract (schema, fallback, stripping), terse/native rendering, configuration validation, and localization.
- `npm run typecheck` passes with no errors (`tsconfig.json` + `tsc --noEmit`).
- End-to-end JSON run with terse mode on: the model supplied `brief` (`查看工作区改动状态`) and the `bash` call executed successfully with the argument stripped.
- Headless tool-registry probe: with the switch off the built-in schemas are unchanged; with it on, `brief` is required and localized; flipping the switch mid-session re-registers the schemas immediately.
- TTY verification in a tmux-driven Pi session: one gray line per call (`✓ bash · 查看最近三条提交记录`), `✗` plus one error line for a failing call, `Ctrl+O` falling back to the native row, flipping the switch rebuilding existing rows, and the pending mark flipping to `✓` only once a `sleep 6` call finished.

## [0.1.1] - 2026-09-01

- Always append the final `Took · spent tokens` line at the bottom of every mode, and place collapse metrics before the final response.
- Count custom tool execution events in turn summaries while preserving their native renderers.
- Added a persistent centered transcript navigation pill for jumping to the prompt and back to the bottom, using Pi's native fullscreen viewport actions; macOS uses `Ctrl+\` and `Ctrl+]` to avoid arrow and function-key conflicts.

## [0.1.0] - 2026-08-31

### Added

- Native-first presentation for Pi's built-in `bash`, `read`, `write`, `edit`, `find`, `grep`, and `ls` tools.
- Fixed presentation modes: `visible`, `compact`, `collapse`, and `hidden`.
- `/briefly` mode selector plus `show`, `reload`, and `reset` commands, with localized UI and common turn-status examples.
- Friendly elapsed time on Pi's working indicator, displayed as `Working... (1 minute 53 seconds)` during each active turn.
- Final `Took` duration with provider-reported spent tokens for visible and compact turns.
- Turn-scoped collapse summaries with elapsed time, tool-call count, read-file count, context usage, token usage, and errors.
- Thinking presentation per preset, including one-line briefs and hidden stubs for condensed modes.
- Project/global mode configuration with validation and atomic writes.
- Public GitHub distribution as a Pi package.

### Changed

- Tool execution remains delegated to Pi's built-in implementations.
- Native renderers remain responsible for syntax highlighting, diffs, images, streaming, truncation, invalidation, and expansion.
- Compact `edit` and new-file `write` output keeps native diff/highlighting while applying concise limits.
- Concise provider-generated thinking summaries are left unchanged rather than compressed a second time.

### Removed

- The experimental `rolling` mode.
- The per-tool `custom` configuration mode.
- Redundant repository specification files; behavior is documented in the README and covered by tests.

### Verification

- Unit and lifecycle test suite: 30 tests passing.
- Multi-tool JSON smoke test and TUI selector verification.
