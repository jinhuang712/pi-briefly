# Changelog

All notable changes to `pi-briefly` are documented here.

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
