# 007 `/briefly` Command UI

## 1. Entry point

Register `/briefly` as an extension command. The command must work only as an interactive mode selector when `ctx.hasUI` is true; non-interactive invocation should notify the current mode.

## 2. Mode selector

The selector contains each mode with a short description:

```text
visible — Full native · 完整原生，保留高亮/diff/流式与展开
compact — Brief + summary · 紧凑：一行摘要+最终 Took，edit/write 保留原生压缩
collapse — Fold after settled · 运行时可见，完成后折叠为汇总
hidden — No UI · 完全隐藏，不留空行
```

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
