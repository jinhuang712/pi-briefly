# pi-briefly

A native-first [Pi](https://github.com/badlogic/pi-mono) extension that removes tool-call noise. There is exactly one switch: with terse mode on, every built-in tool call collapses to a single gray line that carries the short description **the model itself wrote** for that call.

```text
✓ read · 查看配置解析逻辑
✓ bash · 检查工作区改动状态
✗ grep · 搜索旧模式残留
│ Error: path does not exist
```

## How it works

Pi executes the tools exactly as it always does; `pi-briefly` only changes how the rows are drawn, and it never touches the model context beyond one instruction line.

1. **The model writes the description.** While terse mode is on, `pi-briefly` adds a required `brief` argument to the built-in tool schemas (`bash`, `read`, `write`, `edit`, `find`, `grep`, `ls`) and appends a short instruction to the system prompt. The model supplies one line (≤ 80 characters) explaining why it is calling that tool.
2. **The description is never allowed to be missing.** `prepareArguments` runs before schema validation and fills in a heuristic description when the model omits or blanks the argument, so a forgetful model can neither fail the call nor produce an empty row.
3. **The description never reaches the tool.** Execution delegates to Pi's built-in implementation with the display-only argument stripped, so native behaviour and result shapes are untouched.
4. **The row is one line.** Terse rows skip the native box entirely: a status mark, the tool name, and the model's description, truncated to the terminal width. Results are not drawn; a failed call keeps one extra red line with a clipped error excerpt so failures stay diagnosable.
5. **`Ctrl+O` is always the escape hatch.** Expanded rows render through Pi's native renderer, so syntax highlighting, diffs, images, truncation and streaming all remain available.

With the switch off, the built-in tools are registered with their original schemas and rendered natively — the extension is inert.

### Scope

Terse rendering applies to Pi's built-in tools. Tools registered by other extensions (for example MCP tools) keep their own renderer: Pi exposes no renderer-only override hook, and registering a same-named tool would take over execution as well and break the real tool. Those rows keep whatever presentation their own extension provides.

Thinking blocks are not modified by `pi-briefly`; use Pi's native `hideThinkingBlock` setting.

Turn status is independent of the switch: `Working... (elapsed time)` runs during active TUI turns, and a final `(Took … · spent … tokens.)` line is always appended.

## Usage

```text
/briefly          # toggle terse mode
/briefly on
/briefly off
/briefly show     # print the resolved configuration
/briefly reload   # re-read configuration files
/briefly locale auto|en|zh
```

The toggle writes project configuration. `locale` controls the language of the model instruction, the fallback descriptions, and UI notifications; `auto` detects Chinese from the environment and otherwise uses English.

## Configuration

Global: `~/.pi/agent/pi-briefly.json` · Project: `.pi/pi-briefly.json`

```json
{
  "version": 2,
  "terse": true,
  "locale": "auto"
}
```

Project configuration overrides global configuration per key. Invalid values are ignored with a concise warning and never interrupt tool execution.

Configurations from the previous preset design are reported once and otherwise ignored:

```text
.pi/pi-briefly.json: "mode" was removed; pi-briefly now has a single terse switch (run /briefly)
```

## Long-turn navigation

Unchanged by the terse switch. Switch Pi to its fullscreen TUI so the transcript has an application-owned viewport:

```text
/settings                 # choose fullscreen TUI
```

- **Jump to prompt:** `Ctrl+\` on macOS; other platforms keep Pi's native prompt binding.
- **Jump to bottom:** `Ctrl+]` on macOS; other platforms keep Pi's native `End` binding.

On macOS `pi-briefly` rebinds those two actions for the session unless you already configured them, and never writes to your keybindings file. A centered context-sensitive pill above the editor shows the available actions, and a sticky one-line preview keeps the current prompt visible while scrolling.

## Installation

```bash
pi install git:github.com/jinhuang712/pi-briefly
```

Or while developing, without touching settings:

```bash
ln -s /absolute/path/to/pi-briefly .pi/extensions/pi-briefly
```

Restart Pi after installation so it discovers the extension.

## Development

```bash
npm test
```

Run Pi directly from the repository:

```bash
PI_OFFLINE=1 pi --no-session --no-extensions \
  --extension ./src/index.ts \
  --tools bash,read,write,edit,find,grep,ls \
  --mode json \
  -p 'Run one bash tool call: git status --short. Then stop.'
```

Verify in a real TTY: `/briefly` toggles rows between one gray line and native rendering, `Ctrl+O` restores the native row, a partial (streaming) call shows the fallback description before the model's `brief` arrives, and a failing tool shows `✗` plus one error line.

## License

MIT
