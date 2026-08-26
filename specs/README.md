# pi-briefly specification

## Purpose

`pi-briefly` controls how Pi's built-in tool calls appear in the transcript while keeping Pi's native execution and rendering capabilities.

The product has one layer: an immutable presentation mode selected by the user.

## Documents

| Document | Contents |
|---|---|
| [001-requirements.md](001-requirements.md) | Product requirements and acceptance criteria |
| [002-mode-spec.md](002-mode-spec.md) | Immutable preset mode behavior |
| [003-config-spec.md](003-config-spec.md) | Configuration file, schema, validation, precedence |
| [004-style-spec.md](004-style-spec.md) | Tool call/result styles and size controls |
| [005-native-decorator.md](005-native-decorator.md) | Native renderer decorator architecture |
| [006-lifecycle-spec.md](006-lifecycle-spec.md) | Collapse lifecycle state machine and invalidation |
| [007-command-ui.md](007-command-ui.md) | `/briefly` command and mode selector |
| [008-implementation-plan.md](008-implementation-plan.md) | Small-step delivery plan |
| [009-test-plan.md](009-test-plan.md) | Unit, integration, and manual TUI test matrix |

## Status

The repository and specification set contain the fixed mode policy, native adapter, lifecycle tracking, and `/briefly` mode selector. Native decorator and shell behavior are still under active integration; run the test plan before treating the extension as complete.

Implementation must update this status section and the relevant documents as phases land.
