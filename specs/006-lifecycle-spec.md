# 006 Lifecycle Specification

## 1. Controller state

```ts
type ToolCallLifecycle = {
  toolCallId: string;
  toolName: string;
  turnIndex?: number;
  startedAt: number;
  completedAt?: number;
  status: "running" | "completed" | "error";
  invalidate?: () => void;
};

type LifecycleState = {
  active: Map<string, ToolCallLifecycle>;
  completed: ToolCallLifecycle[];
  settled: boolean;
};
```

Store only serializable identifiers/timestamps plus short-lived invalidation callbacks. Clear callbacks on shutdown.

## 2. Events

### `agent_start`

- set `settled = false`
- start a new agent lifecycle

### `turn_start`

- record the turn boundary
- do not hide rows

### `tool_execution_start`

- add the call to `active`
- invalidate active and affected completed rows

### `tool_execution_end`

- remove from `active`
- append to `completed`
- mark the result as completed/error
- invalidate affected rows

### `agent_end`

- record that the provider returned an agent result
- do not collapse yet if Pi may retry/compact

### `agent_settled`

- set `settled = true`
- calculate one aggregate run summary
- collapse mode appends that summary after the final assistant response and hides every settled tool row
- target terminology is not used; the preset is `collapse`

### `session_shutdown`

- clear all lifecycle maps and callbacks

## 3. Collapse policy

Individual rows use the native visible renderer while the agent is active. Once settled, intermediate thinking is replaced by `… intermediate steps collapsed`, a durable flat aggregate summary entry is appended after the final assistant response, and every tool row is hidden. Ctrl+O expands the underlying native tool rows and can collapse them again. Existing rows must rerender without executing the tool again.

## 4. Invalidation

Each renderer registers its `context.invalidate` callback once its call ID is known. Lifecycle state updates invoke callbacks defensively; one failing callback must not prevent other rows from rerendering.

## 5. Race handling

- A late completion event must not resurrect a session that has shut down.
- A tool call from a prior session must not affect the current session.
- Parallel start/end events must be handled by call ID, not array position.
- Repeated invalidation must be cheap and idempotent.
