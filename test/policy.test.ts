import test from "node:test";
import assert from "node:assert/strict";
import { presetStyle, resolveSlot } from "../src/policy.ts";

test("preset modes are fixed", () => {
	assert.equal(presetStyle("visible", { isActive: false, isSettled: true }), "full");
	assert.equal(presetStyle("compact", { isActive: true, isSettled: false }), "brief");
	assert.equal(presetStyle("hidden", { isActive: true, isSettled: false }), "hidden");
});

test("compact keeps edit and write previews native while limiting them", () => {
	const compact = { version: 1 as const, mode: "compact" as const };
	assert.equal(resolveSlot(compact, "edit", "call", { isActive: true, isSettled: false }).style, "compact");
	assert.equal(resolveSlot(compact, "write", "call", { isActive: true, isSettled: false }).style, "compact");
	assert.equal(resolveSlot(compact, "bash", "call", { isActive: true, isSettled: false }).style, "brief");
});

test("collapse keeps tools native until the agent settles", () => {
	assert.equal(presetStyle("collapse", { isActive: true, isSettled: false }), "full");
	assert.equal(presetStyle("collapse", { isActive: false, isSettled: true }), "hidden");
});
