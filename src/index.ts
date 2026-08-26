import {
  createBashToolDefinition,
  createEditToolDefinition,
  createFindToolDefinition,
  createGrepToolDefinition,
  createLsToolDefinition,
  createReadToolDefinition,
  createWriteToolDefinition,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import {
  formatElapsed,
  summarizeToolResult,
  type BriefResult,
} from "./brief.ts";

const BUILT_IN_TOOL_NAMES = [
  "read",
  "bash",
  "edit",
  "write",
  "find",
  "grep",
  "ls",
] as const;

type ToolName = (typeof BUILT_IN_TOOL_NAMES)[number];
type ToolDefinition = any;
type DefinitionFactory = (cwd: string) => ToolDefinition;

const DEFINITION_FACTORIES: Record<ToolName, DefinitionFactory> = {
  read: createReadToolDefinition,
  bash: createBashToolDefinition,
  edit: createEditToolDefinition,
  write: createWriteToolDefinition,
  find: createFindToolDefinition,
  grep: createGrepToolDefinition,
  ls: createLsToolDefinition,
};

type ToolEvent = {
  toolCallId: string;
  toolName: string;
  result?: {
    content?: Array<{ type?: string; text?: string }>;
    isError?: boolean;
  };
  content?: Array<{ type?: string; text?: string }>;
  isError?: boolean;
};

/**
 * Brief completed built-in tool calls without changing their actual results.
 *
 * While a tool is running, Pi's normal renderer is used. Once Pi emits a
 * final tool result, the result renderer switches to a one-line summary. Ctrl+O
 * still expands the original renderer so the full output remains inspectable.
 */
export default function briefly(pi: ExtensionAPI) {
  const briefResults = new Map<string, BriefResult>();
  const startedAt = new Map<string, number>();
  const definitionsByCwd = new Map<string, Record<string, ToolDefinition>>();

  function definitionsFor(cwd: string) {
    let definitions = definitionsByCwd.get(cwd);
    if (!definitions) {
      definitions = Object.fromEntries(
        BUILT_IN_TOOL_NAMES.map((name) => [name, DEFINITION_FACTORIES[name](cwd)]),
      ) as Record<string, ToolDefinition>;
      definitionsByCwd.set(cwd, definitions);
    }
    return definitions;
  }

  function markBrief(event: ToolEvent) {
    if (!event.toolCallId || briefResults.has(event.toolCallId)) return;

    const result = event.result ?? {
      content: event.content,
      isError: event.isError,
    };
    const start = startedAt.get(event.toolCallId);
    briefResults.set(
      event.toolCallId,
      summarizeToolResult(result, start === undefined ? undefined : Date.now() - start),
    );
  }

  pi.on("session_start", async () => {
    briefResults.clear();
    startedAt.clear();
  });

  pi.on("tool_execution_start", async (event) => {
    startedAt.set(event.toolCallId, Date.now());
  });

  // tool_result arrives before the tool row is finalized. tool_execution_end
  // is kept as a fallback for runtimes where only the execution event is
  // available to extensions.
  pi.on("tool_result", async (event) => {
    markBrief(event as ToolEvent);
  });

  pi.on("tool_execution_end", async (event) => {
    markBrief(event as ToolEvent);
    startedAt.delete(event.toolCallId);
  });

  const initialDefinitions = definitionsFor(process.cwd());

  for (const name of BUILT_IN_TOOL_NAMES) {
    const original = initialDefinitions[name];
    if (!original) continue;

    pi.registerTool({
      ...original,
      async execute(toolCallId, params, signal, onUpdate, ctx) {
        return definitionsFor(ctx.cwd)[name].execute(
          toolCallId,
          params,
          signal,
          onUpdate,
          ctx,
        );
      },
      renderResult(result, options, theme, context) {
        const brief = briefResults.get(context.toolCallId);

        // Keep the normal live/expanded renderer while running, and allow
        // Ctrl+O to reveal the original completed output on demand.
        if (!brief || options.isPartial || options.expanded) {
          return original.renderResult?.(result, options, theme, context) ?? new Text("", 0, 0);
        }

        const elapsed = formatElapsed(brief.elapsedMs);
        if (brief.ok) {
          return new Text(theme.fg("success", `✓ done${elapsed}`), 0, 0);
        }

        const detail = brief.detail ? `: ${brief.detail}` : "";
        return new Text(theme.fg("error", `✗ failed${elapsed}${detail}`), 0, 0);
      },
    });
  }
}
