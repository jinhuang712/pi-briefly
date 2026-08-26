import test from "node:test";
import assert from "node:assert/strict";
import { formatElapsed, summarizeToolResult } from "../src/brief.ts";

test("successful results become a brief success", () => {
  assert.deepEqual(
    summarizeToolResult({ content: [{ type: "text", text: "lots of output" }] }, 1250),
    { ok: true, elapsedMs: 1250, detail: undefined },
  );
  assert.equal(formatElapsed(1250), " (1.3s)");
});

test("errors preserve only the first compact line", () => {
  const result = summarizeToolResult(
    { isError: true, content: [{ type: "text", text: "first line\nsecond line" }] },
    500,
  );

  assert.deepEqual(result, {
    ok: false,
    elapsedMs: 500,
    detail: "first line second line",
  });
});
