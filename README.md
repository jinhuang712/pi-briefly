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

Initial repository. Implementation will use Pi's public extension API and start from the official `minimal-mode.ts` example.

## Development

```bash
pi -e ./src/index.ts
```

## Scope

- Keep live tool output available while a tool is executing.
- Briefify each completed tool call automatically.
- Preserve errors and useful small summaries.
- Keep `Ctrl+O` available as the path to expanded output where supported.

Non-goals: changing model context, deleting session data, or hiding the final assistant response.
