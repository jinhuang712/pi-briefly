# AGENTS.md

## Project

`pi-briefly` is a Pi extension that controls built-in tool presentation. It must preserve Pi's built-in tool execution and renderer capabilities wherever possible.

Source entry point:

- `.pi/extensions/pi-briefly.ts`

Specifications:

- `specs/README.md`

## Non-negotiable design rules

1. **Native-first rendering**
   - Delegate execution to Pi's built-in tool definitions.
   - Use native renderers for syntax highlighting, diff views, image handling, truncation, expand hints, streaming, and invalidation.
   - Add behavior with decorators; do not copy or replace native implementations unless a configured style explicitly requires a different presentation.
2. **Preset modes are immutable**
   - `visible`, `compact`, `collapse`, and `hidden` are fixed presets.
   - Users may select a preset but may not partially override it.
3. **Full hiding must be real**
   - Hidden rows must not leave an empty tool box or spacer.
   - Lifecycle changes must invalidate affected rows.
5. **Configuration must be validated**
   - Invalid configuration falls back safely and reports a concise warning in TUI mode.
   - Never let configuration errors break tool execution.
6. **Small-step development**
   - Make one coherent change at a time.
   - Run the focused test after each step, then run the full smoke suite before moving on.
   - Keep specs updated when behavior changes.

## Configuration

Configuration files are documented in `specs/003-config-spec.md`:

- Global: `~/.pi/agent/pi-briefly.json`
- Project: `.pi/pi-briefly.json`

Use `CONFIG_DIR_NAME` and `getAgentDir()` from Pi instead of hardcoding Pi paths in implementation code.

## Validation commands

From this repository:

```bash
node --test --experimental-strip-types test/**/*.test.ts
PI_OFFLINE=1 pi --no-session --no-approve \
  --extension .pi/extensions/pi-briefly.ts \
  --tools bash,read,write,edit,find,grep,ls \
  --mode json -p 'Run the pi-briefly smoke test and stop.'
```

When a change affects interactive rendering, also run Pi in a TTY and manually verify:

- compact/visible transitions
- Ctrl+O expansion
- large edit folding
- streaming/partial states
- hidden mode has no blank tool row

## Scope boundaries

- Do not modify Pi source under `~/dev/projects/pi/pi` as part of this extension unless a separate task explicitly requests an upstream API change.
- Do not reimplement file or shell execution.
- Do not expose full shell commands by default in briefs when a concise purpose can be generated.
- Do not commit user configuration files or session files.
