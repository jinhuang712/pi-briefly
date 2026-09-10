# Changelog

All notable changes to `pi-briefly` are documented here.

## [Unreleased]

### Breaking changes

- Presentation presets (`visible`, `compact`, `collapse`, `hidden`) are gone. `pi-briefly` is now one switch: `/briefly` toggles terse mode on and off.
- Configuration is `{ "version": 2, "terse": boolean, "locale": ... }`. Files written by the previous design are reported once as removed `mode` configuration and otherwise ignored.
- The `/briefly` mode selector, per-tool style limits (`maxLines`, `maxChars`, `headLines`, `tailLines`, `thresholdLines`, `showCommand`, `showContent`, `showExpandHint`), collapse summaries, hidden-step summaries, and thinking condensation were removed. Thinking now renders natively (use Pi's `hideThinkingBlock`).

### Added

- Terse mode: every built-in tool call renders as a single gray line, `✓ read · 查看配置解析逻辑`, with `✗` and one clipped error line when the call fails.
- The model supplies the description: a required `brief` argument is added to the built-in tool schemas while terse mode is on, and one instruction line is appended to the system prompt.
- `prepareArguments` fills in a heuristic description when the model omits or blanks `brief`, so a missing description can neither fail the tool call nor leave an empty row, and older sessions stay replayable.
- Execution delegates to Pi's built-in tools with the display-only `brief` argument stripped before the native implementation runs.
- `Ctrl+O` renders expanded rows through Pi's native renderer.

### Changed

- The switch drives the tool schema as well as rendering: with terse mode off, tools are registered with their original schemas so the model is never asked for a description nobody displays.
- Terse rows skip the native box; native rows keep Pi's background, padding, and status colours.

### Removed

- `src/lifecycle.ts` (settled-state folding and run statistics) and `src/thinking.ts` (thinking condensation), along with their tests.

### Verification

- Unit tests: 34 passing, covering the switch policy, the `brief` contract (schema, fallback, stripping), terse/native rendering, configuration validation, and localization.
- End-to-end JSON run with terse mode on: the model supplied `brief` (`查看工作区改动状态`) and the `bash` call executed successfully with the argument stripped.
- Headless tool-registry probe: with the switch off the built-in schemas are unchanged; with it on, `brief` is required and localized.
- TUI verification still required for rendering changes: toggle, `Ctrl+O`, streaming/partial rows, and failing rows.

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
