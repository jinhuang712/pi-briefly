import test from "node:test";
import assert from "node:assert/strict";
import { formatCollapseSummary, formatTokens } from "../src/summary.ts";

test("formats the aggregate collapse summary", () => {
	assert.equal(
		formatCollapseSummary(
			{ startedAt: 0, toolCalls: 10, filesRead: 5, errors: 0 },
			653_000,
			{ tokens: 200_000, percent: 5 },
			12_345,
		),
		"spent 10 minutes 53 seconds · 10 tool calls · 5 files read · used context 200k (5%) · spent tokens 12.3k",
	);
});

test("formats unknown and singular summary values safely", () => {
	assert.equal(formatTokens(null), "unknown");
	assert.equal(
		formatCollapseSummary(
			{ startedAt: 0, toolCalls: 1, filesRead: 1, errors: 1 },
			1_000,
			undefined,
			0,
		),
		"spent 1 second · 1 tool call · 1 file read · used context unknown · spent tokens 0 · 1 error",
	);
});
