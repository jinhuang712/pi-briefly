import test from "node:test";
import assert from "node:assert/strict";
import { compactResultSummary, excerpt, summarizeCommand, toolBrief } from "../src/brief.ts";

test("summarizes common bash purposes", () => {
	assert.equal(summarizeCommand("git status --short"), "checking git status");
	assert.equal(summarizeCommand("rg 'TODO' src"), "searching text");
	assert.equal(summarizeCommand("printf 'elapsed-time test complete\\n'"), "printing elapsed-time test complete");
});

test("excerpt preserves code lines and marks omitted content", () => {
	assert.equal(excerpt("one\ntwo\nthree", 100, 2), "one\ntwo...");
	assert.equal(excerpt("  indented", 100, 2), "  indented");
});

test("briefs tools by purpose", () => {
	assert.equal(toolBrief("bash", { command: "git status" }), "bash checking git status");
	assert.equal(toolBrief("read", { path: "src/index.ts" }), "read file src/index.ts");
	assert.equal(toolBrief("write", { path: "src/index.ts" }), "write file src/index.ts");
});

test("summarizes compact tool results", () => {
	assert.equal(
		compactResultSummary("read", undefined, { content: [{ type: "text", text: "one\ntwo\n" }] }),
		"2 lines read",
	);
	assert.equal(
		compactResultSummary("write", { content: "one\ntwo" }, { content: [] }),
		"2 lines written · 7 chars",
	);
	assert.equal(
		compactResultSummary("bash", undefined, { content: [], isError: true }),
		"Error",
	);
});
