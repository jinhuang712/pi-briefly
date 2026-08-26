export interface BriefResult {
  ok: boolean;
  elapsedMs?: number;
  detail?: string;
}

export interface ToolResultLike {
  content?: Array<{ type?: string; text?: string }>;
  isError?: boolean;
}

const MAX_DETAIL_LENGTH = 120;

function firstText(result: ToolResultLike | undefined): string | undefined {
  const text = result?.content
    ?.filter((item) => item.type === "text" && typeof item.text === "string")
    .map((item) => item.text?.trim())
    .find(Boolean);

  if (!text) return undefined;

  const oneLine = text.replace(/\s+/g, " ");
  return oneLine.length > MAX_DETAIL_LENGTH
    ? `${oneLine.slice(0, MAX_DETAIL_LENGTH - 1)}…`
    : oneLine;
}

export function summarizeToolResult(
  result: ToolResultLike | undefined,
  elapsedMs?: number,
): BriefResult {
  const ok = result?.isError !== true;
  return {
    ok,
    elapsedMs,
    detail: ok ? undefined : firstText(result),
  };
}

export function formatElapsed(elapsedMs?: number): string {
  if (elapsedMs === undefined || elapsedMs < 1000) return "";
  if (elapsedMs < 10_000) return ` (${(elapsedMs / 1000).toFixed(1)}s)`;
  return ` (${Math.round(elapsedMs / 1000)}s)`;
}
