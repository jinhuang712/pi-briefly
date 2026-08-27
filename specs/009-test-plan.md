# 009 Test Plan

## 1. Pure tests

Test with Node's built-in test runner or the repository's selected TypeScript test runner.

### Config

- default config is stable
- global and project precedence
- malformed JSON fallback
- unknown values rejected or normalized

### Policy

For every mode and tool:

- expected effective call style
- expected effective result style
- partial behavior
- error behavior
- hidden behavior

For thinking presentation (`resolveThinkingPresentation`):

- `visible` keeps native thinking in every state
- `compact` keeps thinking visible while the message streams and briefs it once the message completes
- `collapse` briefs thinking during the run and collapses settled thinking
- expansion restores native thinking in `compact`/`collapse`
- `hidden` suppresses thinking even when expanded
- `thinkingBrief` extracts, cleans, and truncates the first meaningful line

### Briefs

- bash purpose detection: find/grep/ls/cat/git/npm/unknown
- path shortening
- write content summary
- edit count summary
- read range summary
- command text normalization

### Visual limit

- no clipping under limit
- line limit
- character limit
- head/tail smart clipping
- omission hint
- ANSI-preserving rendering
- narrow width
- empty output

## 2. Pi integration smoke tests

Use `pi --mode json` to verify execution and result shape:

- bash success/error
- read success/error
- write new file/error
- edit success/error and diff details
- find, grep, ls success/error

JSON mode validates registration and execution; it does not replace TUI assertions.

## 3. TUI manual matrix

For every mode:

- one bash call
- one read
- one write with TypeScript
- one small edit
- one large edit
- one failed tool
- one partial/streaming tool

Verify:

- tool background and spacing
- no blank hidden rows
- native syntax/diff highlighting
- Ctrl+O expansion
- state updates after agent settles
- thinking streams fully in compact while the message streams, folds to a brief at message completion; collapse shows one-line briefs; hidden leaves a stub and an aggregate step count
- in compact, long GLM/Claude-style thinking blocks fold to one-line briefs when each message completes, before the turn ends
- in hidden, every tool row and thinking block is replaced by a one-line stub; Ctrl+O reveals the native content; no empty tool box remains
- compact mode emits exactly one final `(Took …)` line per tool-using turn
- compact tool rows do not duplicate per-tool durations
- compact edit output keeps only native-colored changed diff lines
- compact write output keeps only the first few native-highlighted preview lines

## 4. Lifecycle scenarios

1. A tool finishing after another tool starts.
2. Retry followed by `agent_settled`.
3. Compaction followed by retry.
4. `/new`, `/resume`, `/fork`, and `/reload` cleanup.

## 5. Configuration scenarios

- choose every mode
- cancel mode selection
- malformed saved file
- reload after external edit
- reset configuration

## 6. Acceptance checklist

- Native renderer is used for native-compatible styles.
- No tool execution is reimplemented.
- Modes are fixed presets.
- Hidden mode is visually empty.
- Large edit output is bounded by smart collapse.
- Every changed renderer is invalidatable.
- No configuration error breaks Pi.
- Specs and implementation agree.
