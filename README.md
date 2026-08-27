# pi-briefly

A native-first [Pi](https://github.com/badlogic/pi-mono) extension for reducing tool-call noise without replacing Pi's execution or renderer capabilities.

`pi-briefly` delegates execution to Pi's built-in `bash`, `read`, `write`, `edit`, `find`, `grep`, and `ls` tools. It decorates how their calls and results appear in the TUI while preserving native syntax highlighting, diffs, images, streaming, truncation, invalidation, and `Ctrl+O` expansion.

## Modes

| Mode | Behavior |
| --- | --- |
| `visible` | Native Pi rendering for every tool call and result. |
| `compact` | Native-like operation briefs plus one-line result summaries; verbose bodies are omitted. |
| `collapse` | Native rendering while the agent runs; after the turn settles, tool rows are folded and an aggregate summary is shown. |
| `hidden` | Tool rows are fully hidden while execution and model context remain unchanged. |

Modes are fixed presets; there is no per-tool override layer.

A compact run looks like this:

```text
bash printing test output
│ 2 lines of output

read file src/index.ts
│ 120 lines read

write file README.md
│ 42 lines written · 980 chars
```

The compact call line uses an italic tool name, normal-weight purpose, and dim argument/path or script brief. The row retains Pi's native tool background, padding, and status colors.

### Collapse output

After a settled turn, `collapse` keeps the final answer and displays:

```text
… intermediate steps collapsed
✓ spent 11 seconds · 4 tool calls · 1 file read · used context 6.4k (2%) · spent tokens 31.2k
```

During execution, tools remain visible using Pi's native renderer. Pi's working indicator also shows elapsed time, for example `Working... (12s)`. `Ctrl+O` expands the folded native tool rows and restores the original thinking/tool presentation; pressing it again folds them back.

The summary is turn-scoped:

- `file read` counts distinct paths read through Pi's `read` tool in the current turn.
- `spent tokens` sums provider-reported assistant usage for the current turn.
- `used context` is the context-window snapshot at settlement.

## Installation

Install the public GitHub package:

```bash
pi install git:github.com/jinhuang712/pi-briefly
```

Or install it locally while developing:

```bash
pi install -l /absolute/path/to/pi-briefly
```

Restart Pi after installation so it discovers the extension.

## Usage

Open the mode selector:

```text
/briefly
```

Direct commands:

```text
/briefly visible
/briefly compact
/briefly collapse
/briefly hidden
/briefly show
/briefly reload
/briefly reset
```

`/briefly reset` restores the project mode to `visible`.

## Configuration

Global configuration:

```text
~/.pi/agent/pi-briefly.json
```

Project configuration:

```text
.pi/pi-briefly.json
```

Example:

```json
{
  "version": 1,
  "mode": "collapse"
}
```

Project configuration takes precedence over global configuration. Configuration errors fall back safely and never interrupt tool execution.

## Development

Run the test suite:

```bash
npm test
```

Run Pi directly from the repository:

```bash
PI_OFFLINE=1 pi --no-session --no-approve \
  --extension .pi/extensions/pi-briefly.ts \
  --tools bash,read,write,edit,find,grep,ls \
  --mode json \
  -p 'Run the pi-briefly smoke test and stop.'
```

See [specs/README.md](specs/README.md) for the implementation and behavior specifications.

## License

MIT
