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

Most tools keep a native-like two-part row, with a concise operation line and a one-line result summary. `edit` keeps Pi's native preview and result diff components, showing only changed diff lines in the native shell. New `write` calls keep Pi's native syntax-highlighted preview, limited to the first few lines:

```text
bash printing test output
│ 2 lines of output

read file src/index.ts
│ 120 lines read

write file README.md
│ 42 lines written · 980 chars

(Took 3 seconds.)
```

The call line contains a styled tool name, purpose, and dim short argument/path or script brief. The result line contains a visible `│` separator and useful counts or completion details rather than the full output or file body. Errors remain visible on the result line. `edit` and new `write` calls are exceptions: their native components are compacted without replacing syntax/diff colors, line numbers, or expand behavior. After the whole turn, compact mode emits one friendly duration such as `(Took 1 minute 53 seconds.)`; native tool rows retain their own per-tool elapsed counter. Compact rows keep Pi's native tool background, padding, and status colors. `Ctrl+O` is available for the native full presentation where Pi supports expansion.

Active working time uses the same day/hour/minute/second units instead of a seconds-only counter.

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
