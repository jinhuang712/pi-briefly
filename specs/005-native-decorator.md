# 005 Native Decorator Architecture

## 1. Native definitions are the source of truth

Build definitions with Pi's exported factories:

```ts
createBashToolDefinition(cwd)
createReadToolDefinition(cwd)
createWriteToolDefinition(cwd)
createEditToolDefinition(cwd)
createFindToolDefinition(cwd)
createGrepToolDefinition(cwd)
createLsToolDefinition(cwd)
```

Register an override that preserves the native metadata:

- description
- prompt snippet/guidelines
- parameters
- constrained sampling
- prepare arguments
- render shell
- native renderer references

Only `execute` is delegated through a `ctx.cwd`-aware wrapper.

## 2. Renderer composition

Pi resolves a same-name extension tool renderer before the built-in renderer. Therefore the extension must explicitly delegate to the captured native slot renderer.

A decorator does the following:

1. Resolve the native component using the native renderer.
2. Pass native renderer state through `context.state`.
3. Pass the native component as `lastComponent` on the next render.
4. Wrap the native component only when the effective style requires an addition.
5. Return the native component unchanged for `full`.
6. Return a controlled empty component for `hidden`.

## 3. Component state

Use separate state keys for call and result native components. Do not store a component in a global map.

```ts
type RendererState = {
  nativeCall?: Component;
  nativeResult?: Component;
  decoratorCall?: Component;
  decoratorResult?: Component;
};
```

The lifecycle controller may keep invalidation callbacks keyed by `toolCallId`, but must remove them at session shutdown.

## 4. Visual limiter

A `VisualLimitComponent` wraps a native component and:

- renders the inner component at the current width
- clips visual lines according to style limits
- supports head/tail retention
- adds an omission/expand hint
- delegates `invalidate()` to the inner component

It must not parse or recolor ANSI output.

## 5. Hidden shell

Full hiding requires a self-rendered shell that can return no lines. The wrapper must not leave the default Pi tool box or spacer.

For visible states, the shell must preserve Pi's pending/success/error backgrounds and padding. Native edit self-shell behavior must not be flattened or replaced by a plain text diff.

## 6. Errors

Decorator failures are contained per render slot. If a decorator fails, fall back to the native component. If native rendering itself fails, let Pi's normal fallback handle it.

## 7. Current prototype migration

Remove or isolate:

- direct result replacement for read/write/edit
- fixed global excerpt numbers
- generic result renderer that drops native output
- `renderShell: "default"` on edit
- any code that reconstructs native diff/highlight formatting

Keep and unit-test:

- command-purpose classification
- path shortening
- brief generation
- normalized config/style resolution
