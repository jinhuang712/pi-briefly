import test from "node:test";
import assert from "node:assert/strict";
import { presentationFor } from "../src/policy.ts";
import type { BrieflyConfig } from "../src/types.ts";

const terse = (value: boolean): BrieflyConfig => ({ version: 2, terse: value, locale: "auto" });

test("the switch is the only presentation input", () => {
	assert.equal(presentationFor(terse(false)), "native");
	assert.equal(presentationFor(terse(true)), "terse");
});

test("expanding a row always falls back to the native presentation", () => {
	assert.equal(presentationFor(terse(true), true), "native");
	assert.equal(presentationFor(terse(false), true), "native");
});
