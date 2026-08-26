# pi-briefly

A Pi extension that keeps tool calls visible while they are running, then briefly renders each tool call after it finishes.

## Goal

Turn this:

```text
bash $ npm test
[large output...]
```

into this after completion:

```text
bash $ npm test
✓ completed
```

The original tool results remain in the session and can be inspected through the session/tree mechanisms. This project only changes TUI presentation.

## Status

MVP implementation is available. It wraps Pi's built-in `read`, `bash`, `edit`, `write`, `find`, `grep`, and `ls` tools. Active tool calls keep Pi's normal renderer; finalized calls become a one-line `✓ done` or `✗ failed` summary. `Ctrl+O` reveals the original output.

## Development

Run directly from this repository:

```bash
pi -e ./src/index.ts
```

Install as a local Pi package for the current project:

```bash
pi install -l /absolute/path/to/pi-briefly
```

## Scope

- Keep live tool output available while a tool is executing.
- Briefify each completed tool call automatically.
- Preserve errors and useful small summaries.
- Keep `Ctrl+O` available as the path to expanded output where supported.

Non-goals: changing model context, deleting session data, or hiding the final assistant response.
