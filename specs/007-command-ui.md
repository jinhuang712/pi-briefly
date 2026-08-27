# 007 `/briefly` Command UI

## 1. Entry point

Register `/briefly` as an extension command. The command must work only as an interactive mode selector when `ctx.hasUI` is true; non-interactive invocation should notify the current mode.

## 2. Mode selector

The selector contains each mode with a short description. The active mode is always listed first, carries a `✓` marker and a localized `(current)` / `（当前）` suffix, and the dialog title names it so the current selection is unmistakable before switching:

```text
pi-briefly mode — compact

✓ compact  — Compact summary + Took (current)
  visible  — Full native
  collapse — Fold after run
  hidden   — No UI
```

The cursor starts on the first entry, which is the active mode.

Selecting a mode immediately applies it without a second confirmation:

1. update the active mode
2. persist it to project scope
3. invalidate existing rows
4. notify the user

## 3. Additional commands

Support:

```text
/briefly              # open mode selector
/briefly show         # show the active mode
/briefly reload       # reload the configuration and rerender
/briefly reset        # reset the project mode to visible
/briefly locale auto  # set UI language (auto, en, or zh)
```

Arguments must not bypass validation. Locale selection is validated against `auto`, `en`, and `zh`.

## 4. Persistence

Use atomic writes. Never persist in-memory renderer state. The project configuration file is `.pi/pi-briefly.json`.

## 5. Runtime application

Apply the normalized configuration in memory, invoke lifecycle/render invalidation, and keep future tool calls on the new policy. If a shell-layout change cannot be applied safely in place, tell the user to run `/reload` and do not leave a partially applied state.
