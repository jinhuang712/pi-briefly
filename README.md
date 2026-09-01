# pi-briefly

A native-first [Pi](https://github.com/badlogic/pi-mono) extension for reducing tool-call noise without replacing Pi's execution or renderer capabilities.

`pi-briefly` delegates execution to Pi's built-in `bash`, `read`, `write`, `edit`, `find`, `grep`, and `ls` tools. It decorates how their calls and results appear in the TUI while preserving native syntax highlighting, diffs, images, streaming, truncation, invalidation, and `Ctrl+O` expansion. All tool execution events contribute to turn timing and aggregate counts; custom tools retain their own native renderer because Pi does not expose a generic tool-rendering interception hook.

## Modes

Modes are fixed presets: choose one whole presentation policy rather than mixing per-tool switches. They change presentation only; Pi still executes the same built-in tools and sends the same model context.

| Mode | While the agent runs | Thinking | After the turn settles |
| --- | --- | --- | --- |
| `visible` | Every tool call and result uses Pi's native renderer. | Native full thinking. | Native tool rows remain; a standalone `Took` line is shown. |
| `compact` | Calls become short operation briefs and results become one-line summaries. `edit` keeps a clipped native diff; new `write` keeps a short native-highlighted preview. | Streams natively, then each completed block becomes a one-line brief. | Tool rows stay compact; a standalone `Took · spent tokens` line is shown. |
| `collapse` | Tool calls/results stay native while running. | One-line briefs while running. | Built-in tool rows are folded, an aggregate summary is placed before the final answer, and a standalone `Took` line is always placed at the bottom. |
| `hidden` | Tool and thinking detail is replaced by one-line stubs. | `… hidden` stub. | A hidden-step count is shown when tools ran; the final answer remains visible, followed by the `Took` line. |

### Which mode should I use?

- **`visible`** — want the complete native Pi transcript.
- **`compact`** — want less output while keeping each operation visible.
- **`collapse`** — want to watch the run, then keep only a turn summary.
- **`hidden`** — want the cleanest transcript and do not need process details.

`Working... (elapsed time)` appears during active TUI turns. Every mode shows a separate final `(Took … · spent … tokens.)` line at the bottom; `collapse` additionally puts tool metrics in its aggregate summary before the final answer. `Ctrl+O` restores native content where the selected presentation supports expansion.

### Long-turn navigation

For long transcripts, switch Pi to its fullscreen TUI so the transcript has an application-owned viewport:

```text
/settings                 # choose fullscreen TUI
```

Then use Pi's native navigation:

- **Jump to prompt:** `Ctrl+\` on macOS (the latest prompt when starting from the bottom); other platforms keep Pi's native prompt bindings.
- **Jump to bottom:** `Ctrl+]` on macOS (resume following new output); other platforms keep Pi's native `End` binding.

Pi also provides a native jump-to-top action (`Home` by default); configure `tui.altScreen.top` if your keyboard or terminal does not provide that key.

These actions are provided by Pi rather than reimplemented by `pi-briefly`, so they keep working with native transcript rendering. They are available only in fullscreen TUI; regular TUI keeps its native terminal scrollback and does not show the navigation pill. On macOS, `pi-briefly` changes the prompt and bottom actions to `Ctrl+\` and `Ctrl+]` for the session unless you already configured them. It does not write to your keybindings file. In fullscreen mode, the extension shows a persistent centered context-sensitive pill above the editor:

```text
[ Jump to prompt (Ctrl+\) ↑ ]
[ Jump to bottom (Ctrl+]) ↓ ]
```

At the bottom it only shows the prompt action, at a prompt it only shows the bottom action, and in between it shows both. The `/briefly` selector also shows the currently configured prompt and bottom keys. Their keys can be customized in `~/.pi/agent/keybindings.json` with `tui.altScreen.previousPrompt`, `tui.altScreen.bottom`, and `tui.altScreen.top`.

Long reasoning models (GLM, Claude, GPT-5) can emit very long thinking blocks. `pi-briefly` condenses them with the same presets: `compact` keeps the thinking process fully visible while its message streams and folds each block into a one-line brief (its first meaningful line) the moment the message completes — always before the turn ends; `collapse` shows one-line briefs during the run and `… intermediate steps collapsed` after settlement. Provider-generated concise reasoning summaries, such as GPT's short standalone lines, are left unchanged rather than compressed a second time. `hidden` suppresses thinking details; `visible` keeps Pi's native full rendering.

A compact run looks like this:

```text
bash printing test output
│ 2 lines of output

read file src/index.ts
│ 120 lines read

write file README.md
│ 42 lines written · 980 chars

(Took 3 seconds · spent 12.3k tokens.)
```

The compact call line uses a styled tool name, purpose, and dim argument/path or script brief. Each result keeps a visible `│` separator. `edit` keeps Pi's native preview and result diff renderer, showing only changed diff lines in the native shell. New `write` calls keep Pi's native syntax-highlighted preview, limited to the first few lines. Other rows retain Pi's native tool background, padding, and status colors. Every mode emits one final `(Took … · spent … tokens.)` line after the whole turn; native tool rows continue to provide their own per-tool elapsed counter. `Took` (including turn token usage) and the live `Working...` timer are common pi-briefly capabilities, not mode-specific tool presentation features.

### Collapse output

After a settled turn, `collapse` keeps the final answer and displays:

```text
… intermediate steps collapsed
✓ spent 11 seconds · 4 tool calls · 1 file read · used context 6.4k (2%) · spent tokens 31.2k

The final answer appears here.

(Took 11 seconds · spent 31.2k tokens.)
```

During execution, tools remain fully visible using Pi's native renderer, and thinking condenses to one-line briefs. After settlement, built-in tool rows are folded and the aggregate summary appears before the final answer. Pi's working indicator shows friendly elapsed time, for example `Working... (1 minute 53 seconds)`. The standalone turn duration is appended last in every mode; native tool rows retain their own elapsed counter. `Ctrl+O` expands the folded native tool rows and restores the original thinking/tool presentation; pressing it again folds them back.

The summary is turn-scoped:

- `tool calls` counts all tool execution events in the current turn, including custom tools.
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

The TUI lists the active mode first and shows the common turn status examples separately in muted text:

```text
pi-briefly mode — compact

→ ✓ compact      Compact summary (current)
    visible      Full native
    collapse     Fold after run
    hidden       No UI

Common:
  Working... (1 minute 53 seconds)
  Took 3 seconds · spent 12.3k tokens
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

Set the UI language with `/briefly locale auto`, `/briefly locale en`, or `/briefly locale zh`. `auto` detects Chinese locales from the environment and otherwise uses English.

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
  "mode": "collapse",
  "locale": "auto"
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
PI_OFFLINE=1 pi --no-session --no-extensions \
  --extension ./src/index.ts \
  --tools bash,read,write,edit,find,grep,ls \
  --mode json \
  -p 'Run the pi-briefly smoke test and stop.'
```

See the source and tests for implementation details and behavior coverage.

## License

MIT
