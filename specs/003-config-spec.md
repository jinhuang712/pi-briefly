# 003 Configuration Specification

## 1. Files

- Global: `~/.pi/agent/pi-briefly.json`
- Project: `<cwd>/.pi/pi-briefly.json`

Use Pi's exported `getAgentDir()` and `CONFIG_DIR_NAME` when resolving paths.

## 2. Precedence

```text
built-in defaults
→ global file
→ project file
→ current runtime selection
```

A mode selection replaces the active policy.

## 3. Versioned schema

```json
{
  "version": 1,
  "mode": "collapse",
  "locale": "auto"
}
```

## 4. Types

```ts
type PresetMode = "visible" | "compact" | "collapse" | "hidden";
type Locale = "en" | "zh" | "auto";
type ToolName = "bash" | "read" | "write" | "edit" | "find" | "grep" | "ls";
```

## 5. Validation

Validation rules:

- unknown top-level keys are ignored
- unknown mode falls back to defaults with a warning
- unknown locale falls back to the previous locale with a warning
- `auto` detects Chinese from `LANG`/`LC_ALL`/`LC_MESSAGES`/`LANGUAGE`, otherwise uses English
- malformed JSON never prevents tool execution

The loader returns a normalized immutable configuration object.

## 6. Persistence

Mode changes save to project scope using atomic write (`.tmp` then rename) and create the parent directory when necessary. The extension must never write session files or user secrets into the repository.

## 7. Runtime behavior

`/briefly` updates in-memory configuration and rerenders visible rows. `/briefly reload` reloads both configuration files and reapplies the active mode. Shell-layout changes may use the standard Pi reload path.
