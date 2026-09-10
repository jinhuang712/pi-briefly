# AGENTS.md

## Project

`pi-briefly` is a Pi extension that controls built-in tool presentation. It must preserve Pi's built-in tool execution and renderer capabilities wherever possible.

Source entry point:

- `src/index.ts`

Documentation and behavior coverage:

- `README.md`
- `test/`

## Non-negotiable design rules

1. **Native-first rendering**
   - Delegate execution to Pi's built-in tool definitions.
   - Use native renderers for syntax highlighting, diffs, images, truncation, expand hints, streaming, and invalidation.
   - Add behavior with decorators; do not copy or replace native implementations unless the switch explicitly requires a different presentation.
2. **One switch, no presets**
   - `terse` is a single boolean and the only presentation input. Do not reintroduce per-tool or per-slot style knobs, mode selectors, or presentation presets.
   - Expanded rows (`Ctrl+O`) always fall back to the native presentation, so the switch is never destructive.
   - Terse rows must not leave an empty tool box or spacer; flipping the switch must re-render existing rows.
3. **The `brief` contract**
   - The terse line shows the description the model wrote, so `brief` is a required schema argument while terse mode is on and is stripped before the native tool runs. It is display-only and must never change execution or result shapes.
   - `prepareArguments` must always hand validation a complete argument object: a model that omits `brief` must neither fail the call nor produce an empty row.
   - With terse mode off, register the original schemas: never ask the model for a description nobody displays.
4. **Configuration must be validated**
   - Invalid configuration falls back safely and reports a concise warning in TUI mode.
   - Never let configuration errors break tool execution.
5. **Small-step development**
   - Make one coherent change at a time.
   - Run the focused test after each step, then run the full smoke suite before moving on.
   - Keep the README and tests updated when behavior changes.

## Configuration

Configuration files are documented in `README.md`:

- Global: `~/.pi/agent/pi-briefly.json`
- Project: `.pi/pi-briefly.json`

Use `CONFIG_DIR_NAME` and `getAgentDir()` from Pi instead of hardcoding Pi paths in implementation code.

## Validation commands

From this repository:

```bash
node --test --experimental-strip-types test/*.test.ts
PI_OFFLINE=1 pi --no-session --no-extensions \
  --extension ./src/index.ts \
  --tools bash,read,write,edit,find,grep,ls \
  --mode json -p 'Run one bash tool call: git status --short. Then stop.'
```

When a change affects interactive rendering, also run Pi in a TTY and manually verify:

- `/briefly` toggles between one gray line per call and native rendering
- `Ctrl+O` expansion restores the native row
- streaming/partial calls show the fallback description before `brief` arrives
- a failing tool shows `✗` plus one error line
- flipping the switch leaves no empty tool row

## Scope boundaries

- Do not modify Pi source under `~/dev/projects/pi/pi` as part of this extension unless a separate task explicitly requests an upstream API change.
- Do not reimplement file or shell execution.
- Do not expose full shell commands by default in briefs when a concise purpose can be generated.
- Tools owned by other extensions (for example MCP tools) cannot be restyled: Pi has no renderer-only override hook and a same-named registration would take over execution. Report that limitation instead of hacking around it.
- Do not commit user configuration files or session files.
