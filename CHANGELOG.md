# Changelog

All notable changes to `pi-briefly` are documented here.

## [Unreleased]

### Added

- Friendly elapsed time on Pi's working indicator, displayed as `Working... (1 minute 53 seconds)` during each active turn.
- Thinking presentation per preset: `compact` keeps the thinking process fully visible while its message streams and folds each block to a one-line brief (its first meaningful line) as soon as the message completes, before the turn ends; `collapse` shows one-line briefs during the run and the collapsed label after settlement; `hidden` leaves a one-line stub and an aggregate step count so the transcript never looks like a blank gap; `visible` keeps native full rendering. `Ctrl+O` reveals the native content in every condensed mode.

### Fixed

- Cleaned escaped newlines and quotes from compact `bash` operation labels.
- Restored native-like compact rows with Pi tool-title styling, native status backgrounds, operation lines, and concise result summaries for every built-in tool.
- Styled compact calls with a tool name, purpose, dim argument/script brief, and visible result separator.
- Kept `edit` on Pi's native renderer in compact mode while showing only changed diff lines in the native shell.
- Kept new-file `write` previews on Pi's native renderer while limiting them to the first few lines.
- Added one friendly day/hour/minute/second `Took` duration after each completed compact turn; native tool rows retain their own elapsed counters.

## [0.1.0] - 2026-08-26

### Added

- Native-first presentation for Pi's built-in `bash`, `read`, `write`, `edit`, `find`, `grep`, and `ls` tools.
- Fixed presentation modes: `visible`, `compact`, `collapse`, and `hidden`.
- `/briefly` mode selector plus `show`, `reload`, and `reset` commands.
- Turn-scoped collapse summaries with elapsed time, tool-call count, read-file count, context usage, token usage, and errors.
- `… intermediate steps collapsed` marker for settled thinking blocks.
- Native `Ctrl+O` expansion and restoration after collapse.
- Project/global mode configuration with validation and atomic writes.
- Public GitHub distribution as a Pi package.

### Changed

- Tool execution remains delegated to Pi's built-in implementations.
- Native renderers remain responsible for syntax highlighting, diffs, images, streaming, truncation, and invalidation.

### Removed

- The experimental `rolling` mode.
- The per-tool `custom` configuration mode.

### Verification

- Unit and lifecycle test suite: 11 tests passing.
- Multi-tool smoke tests covering tool execution, thinking blocks, settlement, and collapse summaries.
