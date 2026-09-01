import test from "node:test";
import assert from "node:assert/strict";
import { LifecycleController } from "../src/lifecycle.ts";

test("lifecycle tracks active and completed calls", () => {
	const lifecycle = new LifecycleController();
	lifecycle.start("one", "bash");
	assert.deepEqual(lifecycle.view("one"), { isActive: true, isSettled: false });
	lifecycle.complete("one", false);
	assert.deepEqual(lifecycle.view("one"), { isActive: false, isSettled: false });
	assert.equal((lifecycle.durationMs("one") ?? -1) >= 0, true);
});

test("prior collapsed rows stay settled for a new agent", () => {
	const lifecycle = new LifecycleController();
	lifecycle.start("one", "bash");
	lifecycle.complete("one", false);
	lifecycle.settleAgent("summary");
	assert.equal(lifecycle.isSettled(), true);
	assert.equal(lifecycle.view("one").isSettled, true);
	lifecycle.beginAgent();
	assert.equal(lifecycle.view("one").isSettled, true);
	assert.equal(lifecycle.statistics().toolCalls, 0);
});

test("all tool names contribute to run statistics", () => {
	const lifecycle = new LifecycleController();
	lifecycle.beginAgent();
	lifecycle.start("mcp", "mcpScript");
	lifecycle.complete("mcp", false);
	assert.equal(lifecycle.statistics().toolCalls, 1);
});

test("summary belongs to the first tool and tracks run statistics", () => {
	const lifecycle = new LifecycleController();
	lifecycle.beginAgent();
	lifecycle.start("one", "read", { path: "a.ts" });
	lifecycle.start("two", "read", { path: "b.ts" });
	lifecycle.complete("one", false);
	lifecycle.complete("two", true);
	lifecycle.settleAgent("run summary");
	assert.equal(lifecycle.summaryFor("one"), "run summary");
	assert.equal(lifecycle.summaryFor("two"), undefined);
	const stats = lifecycle.statistics();
	assert.equal(stats.toolCalls, 2);
	assert.equal(stats.filesRead, 2);
	assert.equal(stats.errors, 1);
});

test("invalidation failures do not stop other rows", () => {
	const lifecycle = new LifecycleController();
	let invalidated = 0;
	lifecycle.start("one", "bash");
	lifecycle.registerInvalidation("one", () => {
		throw new Error("stale");
	});
	lifecycle.start("two", "read");
	lifecycle.registerInvalidation("two", () => {
		invalidated++;
	});
	lifecycle.complete("two", false);
	assert.equal(invalidated > 0, true);
});
