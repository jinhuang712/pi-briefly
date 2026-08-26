import test from "node:test";
import assert from "node:assert/strict";
import { presetStyle, resolveSlot } from "../src/policy.ts";

test("preset modes are fixed", () => {
	assert.equal(presetStyle("visible", { isActive: false, isSettled: true }), "full");
	assert.equal(presetStyle("compact", { isActive: true, isSettled: false }), "brief");
	assert.equal(presetStyle("hidden", { isActive: true, isSettled: false }), "hidden");
});

test("collapse keeps tools native until the agent settles", () => {
	assert.equal(presetStyle("collapse", { isActive: true, isSettled: false }), "full");
	assert.equal(presetStyle("collapse", { isActive: false, isSettled: true }), "hidden");
});
