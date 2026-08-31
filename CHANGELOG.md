# Changelog

All notable changes to `pi-briefly` are documented here.

## [Unreleased]

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
