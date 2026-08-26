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
| `compact` | Return a short excerpt component; preserve native result data for expansion when possible |
| `brief` | Return only the generated operation brief as a flat line without tool-box padding |
| `hidden` | Return an empty component through the hidden self-shell |

The native component must receive its original `lastComponent`, `state`, `args`, `cwd`, `expanded`, `isPartial`, and `invalidate` context.

## 3. Tool-specific behavior

### Bash

- Native output uses Pi's streaming renderer.
- `brief` call uses purpose classification and a safely shortened command when enabled.
- `partial` result uses the native component with a visual output limit.
- `full` keeps native output and expand behavior.

### Read

- Native renderer retains language highlighting, image handling, truncation notes, and ranges.
- `partial` limits the rendered text while keeping the native component.
- `highlight` keeps syntax highlighting and can use an excerpt window.
- `brief` shows target path and range only.

### Write

- Native renderer remains the source of code highlighting and line-count/expand hints.
- `partial` decorates the native content preview.
- `compact` shows a short content excerpt.
- `brief` shows destination and purpose without content.
- Hidden successful completion text does not hide errors.

### Edit

- Native renderer remains the source of pre-execution diff preview and result diff rendering.
- `highlight` is the normal style for diff-aware rendering.
- `partial` clips a large rendered diff while retaining colors and line numbers.
- `compact` shows a diff summary or a small first/last section.
- `brief` shows target path and edit count.
- `hidden` hides the diff but must not affect the edit operation.

### Find/Grep/LS

- `full` delegates native result formatting and limits.
- `partial` uses native output with a visual limit.
- `compact` shows a small result count/excerpt.
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
