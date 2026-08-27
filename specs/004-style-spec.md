# 004 Style Specification

## 1. Slot model

Each tool is rendered through two logical slots:

- `call`: path, command, write content preview, edit preview, and operation brief
- `result`: output, completion status, error, diff result, and operation brief fallback

The effective style is resolved independently for each slot by the active fixed mode.

## 2. Native-first rules

| Style | Native behavior |
|---|---|
| `full` | Return the native component unchanged |
| `highlight` | Return native syntax/diff component, optionally decorated with smart clipping |
| `partial` | Return native component through a visual line/character limiter |
| `compact` | Return a native-like operation line plus a one-line result summary; do not render verbose bodies |
| `brief` | Return only the generated operation brief as a flat line without tool-box padding |
| `hidden` | Return an empty component through the hidden self-shell |

The native component must receive its original `lastComponent`, `state`, `args`, `cwd`, `expanded`, `isPartial`, and `invalidate` context.

## 3. Tool-specific behavior

### Bash

- Native output uses Pi's streaming renderer.
- The compact call uses purpose classification and a safely shortened command brief.
- The compact result shows output line count and truncation state.
- `partial` result uses the native component with a visual output limit.
- `full` keeps native output and expand behavior.

### Read

- Native renderer retains language highlighting, image handling, truncation notes, and ranges.
- The compact call shows the read purpose and target path.
- The compact result shows the number of lines read and truncation state.
- `partial` limits the rendered text while keeping the native component.
- `highlight` keeps syntax highlighting and can use an excerpt window.
- `brief` shows target path and range only.

### Write

- Native renderer remains the source of code highlighting and line-count/expand hints.
- The compact call shows the write purpose and destination path.
- The compact result shows written line and character counts.
- `partial` decorates the native content preview.
- `brief` shows destination and purpose without content.
- Hidden successful completion text does not hide errors.

### Edit

- Native renderer remains the source of pre-execution diff preview and result diff rendering.
- The compact result shows the number of replaced blocks.
- `highlight` is the normal style for diff-aware rendering.
- `partial` clips a large rendered diff while retaining colors and line numbers.
- `brief` shows target path and edit count.
- `hidden` hides the diff but must not affect the edit operation.

### Find/Grep/LS

- `full` delegates native result formatting and limits.
- `partial` uses native output with a visual limit.
- `compact` shows a one-line result count and the operation target.
- `brief` shows operation and target/pattern.

## 4. Smart large-content policy

For a rendered component exceeding `thresholdLines`:

1. keep `headLines`
2. keep `tailLines`
3. insert a muted omission line
4. include the configured/native expand hint
5. preserve ANSI styling and line backgrounds where possible

For narrow terminals, limits are applied after rendering to visual lines, not raw source lines.

## 5. Errors and partial states

- Error output is visible unless the effective slot style is `hidden` and the global error policy explicitly allows hiding errors.
- Partial output uses the style's partial behavior and must never falsely look settled.
- Brief mode may show `Running <purpose>...` while partial, then the settled brief.

## 6. Style resolution

```ts
resolveStyle(mode, toolName, slot, lifecycleState): ToolStyle
```

Preset resolution is fixed. Lifecycle transformation for collapse is applied after preset resolution and before rendering.
