# 007 `/briefly` Command UI

## 1. Entry point

Register `/briefly` as an extension command. The command must work only as an interactive mode selector when `ctx.hasUI` is true; non-interactive invocation should notify the current mode.

## 2. Mode selector

The selector contains:

```text
visible
compact
collapse
hidden
```

Selecting a mode:

1. ask for confirmation
2. update the active mode
3. persist it to project scope
4. invalidate existing rows
5. notify the user

## 3. Additional commands

Support:

```text
/briefly              # open mode selector
/briefly show         # show the active mode
/briefly reload       # reload the configuration and rerender
/briefly reset        # reset the project mode to visible
```

Arguments must not bypass validation.

## 4. Persistence

Use atomic writes. Never persist in-memory renderer state. The project configuration file is `.pi/pi-briefly.json`.

## 5. Runtime application

Apply the normalized configuration in memory, invoke lifecycle/render invalidation, and keep future tool calls on the new policy. If a shell-layout change cannot be applied safely in place, tell the user to run `/reload` and do not leave a partially applied state.
