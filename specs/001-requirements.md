# 001 Requirements

## 1. Product goal

Provide a configurable Pi tool transcript presentation that reduces noise without losing important native information. Tool execution must remain Pi's built-in implementation.

## 2. In scope

The extension covers the built-in tools:

- `bash`
- `read`
- `write`
- `edit`
- `find`
- `grep`
- `ls`

It controls call headers, partial progress, results, code previews, diff previews, brief summaries, and row visibility.

## 3. Mode requirements

The active mode is exactly one of:

- `visible`
- `compact`
- `collapse`
- `hidden`

Preset modes are immutable. Selecting a preset never applies per-tool overrides.

## 4. Native behavior requirements

The extension MUST preserve native behavior when a style is native-compatible:

- write/read syntax highlighting
- edit preview and diff rendering
- bash streaming output
- image output and image visibility handling
- native truncation warnings
- native `Ctrl+O` expansion
- native component caching and invalidation
- native tool metadata, schema, argument preparation, and result shapes

The extension MUST NOT reimplement tool execution.

## 5. Brief requirements

Briefs are concise and operation-oriented:

- bash: purpose-first summary, optionally a shortened command
- read: target path and optional line range
- write: target path, optional line count, optional content preview
- edit: target path, optional edit count and diff summary
- find/grep/ls: operation and target/pattern

Briefs must be rendered without exposing full command arguments by default.

## 6. Visibility requirements

`hidden` must hide call, partial, result, diff, output, and brief. It must not leave a blank tool box or a visible spacer.

Collapse transitions must rerender already-created rows when lifecycle state changes.

## 7. Configuration requirements

Configuration is read from global and project files, validated, and safely defaulted. The user can select modes through `/briefly`.

Configuration changes apply to future and existing rows where technically possible. Changes affecting the shell layout trigger a reload or use the dynamic self-shell implementation.

## 8. Usability requirements

- Large edit diffs must not consume the full transcript by default.
- Code previews must remain readable and syntax-highlighted.
- Every truncated view must provide a clear expansion path.
- Presets must be understandable without reading JSON.

## 9. Non-functional requirements

- No unbounded lifecycle/component state.
- No uncaught renderer exception may break the agent.
- Configuration parsing must be synchronous from the renderer's point of view.
- Pure policy and formatting functions must be unit-testable.
- Interactive-only UI must be guarded by `ctx.hasUI`/`ctx.mode`.
