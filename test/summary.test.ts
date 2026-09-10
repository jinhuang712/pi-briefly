import test from "node:test";
import assert from "node:assert/strict";
import { formatCallDuration } from "../src/summary.ts";

test("formats per-call durations compactly", () => {
	assert.equal(formatCallDuration(0), "0.0s");
	assert.equal(formatCallDuration(420), "0.4s");
	assert.equal(formatCallDuration(9_940), "9.9s");
	assert.equal(formatCallDuration(12_400), "12s");
	assert.equal(formatCallDuration(83_000), "1m 23s");
	assert.equal(formatCallDuration(3_900_000), "1h 05m");
});
