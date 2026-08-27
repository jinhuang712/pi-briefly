# 002 Mode Specification

## 1. Mode model

```ts
type PresetMode =
  | "visible"
  | "compact"
  | "collapse"
  | "hidden";
```

The active mode is a preset selection, not a mergeable set of switches.

## 2. `visible`

Normal native presentation for every tool:

- native call renderer
- native partial renderer
- native result renderer
- native code/diff/image rendering
- native expand behavior

The preset has no user-editable per-tool overrides.

## 3. `compact`

Every tool keeps a native-like two-part row, with a concise operation line and a one-line result summary:

```text
bash printing test output
│ 2 lines of output

read file src/index.ts
│ 120 lines read

write file README.md
│ 42 lines written · 980 chars
```

The call line contains an italic tool name, a normal-weight purpose, and a dim short argument/path or script brief. The result line contains useful counts or completion details rather than the full output, diff, or file body. Errors remain visible on the result line. The row keeps Pi's native tool background, padding, and status colors. `Ctrl+O` is available for the native full presentation where Pi supports expansion.

## 4. `collapse`

During an agent run, tool calls use the native `visible` presentation. After the agent is settled:

- the completed tool call/result rows are hidden
- intermediate thinking/planning content is replaced by `… intermediate steps collapsed`
- one aggregate run summary is appended after the final assistant response
- the summary is a flat, single-line component without the native tool box/padding
- the final assistant response remains unchanged

`Ctrl+O` expands the underlying native tool rows after they have been collapsed.

The transition occurs at `agent_settled`, not merely at `turn_end`, so retries and compaction are not hidden prematurely.

## 5. `hidden`

No process representation is rendered:

- no call
- no partial state
- no result
- no brief
- no empty shell row

Tool execution and model context are unaffected.

## 6. Precedence

```text
preset mode
  visible/compact/collapse/hidden => fixed policy
```

All modes are fixed presets; there is no per-tool override layer.

## 7. State transitions

```text
idle -> running -> completed

agent_start       : reset settled state
agent_settled     : collapse mode hides settled rows and appends the aggregate summary
session shutdown  : discard runtime visibility state
```
