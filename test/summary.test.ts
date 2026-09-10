import test from "node:test";
import assert from "node:assert/strict";
import { formatDuration, formatTook, formatTokens } from "../src/summary.ts";

test("formats elapsed durations with friendly units", () => {
	assert.equal(formatDuration(0), "0 seconds");
	assert.equal(formatDuration(1_000), "1 second");
	assert.equal(formatDuration(113_000), "1 minute 53 seconds");
	assert.equal(formatDuration(90_061_000), "1 day 1 hour 1 minute 1 second");
});

test("formats a completed turn duration", () => {
	assert.equal(formatTook(113_000), "(Took 1 minute 53 seconds.)");
	assert.equal(formatTook(113_000, "en", 12_345), "(Took 1 minute 53 seconds · spent 12.3k tokens.)");
	assert.equal(formatTook(113_000, "zh", 12_345), "（耗时 1 分钟 53 秒 · 消耗 12.3k tokens。）");
});

test("formats unknown and large token counts safely", () => {
	assert.equal(formatTokens(null), "unknown");
	assert.equal(formatTokens(12_345), "12.3k");
	assert.equal(formatTokens(200_000), "200k");
	assert.equal(formatTokens(1_500_000), "1.5m");
});
