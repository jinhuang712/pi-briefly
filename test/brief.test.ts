import test from "node:test";
import assert from "node:assert/strict";
import { excerpt, summarizeCommand, toolBrief } from "../src/brief.ts";

test("summarizes common bash purposes", () => {
	assert.equal(summarizeCommand("git status --short"), "checking git status");
	assert.equal(summarizeCommand("rg 'TODO' src"), "searching text");
});

test("excerpt preserves code lines and marks omitted content", () => {
	assert.equal(excerpt("one\ntwo\nthree", 100, 2), "one\ntwo...");
	assert.equal(excerpt("  indented", 100, 2), "  indented");
});

test("briefs tools by purpose", () => {
	assert.equal(toolBrief("bash", { command: "git status" }), "bash checking git status");
	assert.equal(toolBrief("write", { path: "src/index.ts" }), "write src/index.ts");
});
