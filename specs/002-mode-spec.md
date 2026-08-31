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

The preset has no user-editable per-tool overrides. After each settled agent turn, it also emits one friendly duration such as `(Took 3 seconds · spent 12.3k tokens.)`. `Took` (including turn token usage) and the live `Working...` timer are common extension capabilities rather than mode-specific tool presentation.

## 3. `compact`

Most tools keep a native-like two-part row, with a concise operation line and a one-line result summary. `edit` keeps Pi's native preview and result diff components, showing only changed diff lines in the native shell. New `write` calls keep Pi's native syntax-highlighted preview, limited to the first few lines:

```text
bash printing test output
│ 2 lines of output

read file src/index.ts
│ 120 lines read

write file README.md
│ 42 lines written · 980 chars

(Took 3 seconds · spent 12.3k tokens.)
```

The call line contains a styled tool name, purpose, and dim short argument/path or script brief. The result line contains a visible `│` separator and useful counts or completion details rather than the full output or file body. Errors remain visible on the result line. `edit` and new `write` calls are exceptions: their native components are compacted without replacing syntax/diff colors, line numbers, or expand behavior. After the whole turn, compact mode emits one friendly duration such as `(Took 1 minute 53 seconds.)`; native tool rows retain their own per-tool elapsed counter. Visible and compact modes emit this final duration for every settled agent turn, including turns without tool calls. Compact rows keep Pi's native tool background, padding, and status colors. `Ctrl+O` is available for the native full presentation where Pi supports expansion. The final `Took` line includes the turn's provider-reported token usage when available.

Active working time uses the same day/hour/minute/second units instead of a seconds-only counter.

Assistant thinking stays fully visible while its message streams. The moment the message completes — always before the turn ends — each long thinking block folds into a one-line brief (the thinking's first meaningful line); provider-generated concise reasoning summaries are left unchanged rather than compressed again. `Ctrl+O` restores the native thinking text.

## 4. `collapse`

During an agent run, tool calls use the native `visible` presentation while thinking blocks are condensed to one-line briefs as they stream. After the agent is settled:

- the completed tool call/result rows are hidden
- intermediate thinking/planning content is replaced by `… intermediate steps collapsed`
- one aggregate run summary is appended after the final assistant response
- the summary is a flat, single-line component without the native tool box/padding
- the final assistant response remains unchanged

`Ctrl+O` expands the underlying native tool rows and restores full thinking after they have been collapsed.

The transition occurs at `agent_settled`, not merely at `turn_end`, so retries and compaction are not hidden prematurely.

## 5. `hidden`

No process detail is rendered, but the transcript must never look like a blank gap. Each hidden thinking block leaves a one-line stub (`… hidden` / `… 已隐藏`); each turn that involved tools appends an aggregate stub (`… 4 steps hidden` / `… 已隐藏 4 个步骤`). `Ctrl+O` restores the native thinking text and the native tool rows. Tool execution and model context are unaffected.

## 6. Thinking presentation

Models such as GLM, Claude, or GPT-5 can emit very long reasoning blocks. Assistant thinking is a presentation concern and follows the same immutable presets:

| Mode | While the message streams | Message complete | Run settled | `Ctrl+O` expanded |
| --- | --- | --- | --- | --- |
| `visible` | native full | native full | native full | native |
| `compact` | native full thinking | one-line brief | one-line brief | native full |
| `collapse` | one-line brief | one-line brief | `… intermediate steps collapsed` | native full |
| `hidden` | `… hidden` stub | `… hidden` stub | one-line aggregate stub | native full |

The condensing reuses Pi's `assistant-thinking` markdown transformer and its streaming flag; Pi rerenders the message when streaming completes, so the fold happens without touching model context.

## 7. Precedence

```text
preset mode
  visible/compact/collapse/hidden => fixed policy
```

All modes are fixed presets; there is no per-tool override layer.

## 8. State transitions

```text
idle -> running -> completed

agent_start       : reset settled state
agent_settled     : collapse mode hides settled rows and appends the aggregate summary
session shutdown  : discard runtime visibility state
```
