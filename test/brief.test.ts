import test from "node:test";
import assert from "node:assert/strict";
import { BRIEF_MAX_CHARS, briefFromArgs, callParts, describeCall, errorExcerpt, summarizeCommand } from "../src/brief.ts";

test("summarizes common bash purposes", () => {
	assert.equal(summarizeCommand("git status --short"), "checking git status");
	assert.equal(summarizeCommand("rg 'TODO' src"), "searching text");
	assert.equal(summarizeCommand("printf 'elapsed-time test complete\\n'"), "printing elapsed-time test complete");
});

test("localizes heuristic purposes", () => {
	assert.equal(summarizeCommand("git status --short", "zh"), "检查 Git 状态");
	assert.equal(callParts("read", { path: "src/index.ts" }, "zh").purpose, "读取");
	assert.equal(callParts("read", { path: "README.md" }, "en").purpose, "reviewing docs");
	assert.equal(callParts("find", { pattern: "*.ts" }, "zh").purpose, "查找文件");
	assert.equal(callParts("edit", { path: "src/i18n.ts" }, "en").purpose, "resolving locale");
	assert.equal(callParts("write", { path: "README.md" }, "en").purpose, "updating docs");
});

test("the model supplied brief wins and carries no heuristic detail", () => {
	assert.deepEqual(describeCall("read", { path: "src/index.ts", brief: "查看入口实现" }), { brief: "查看入口实现" });
	// Multi-line and padded briefs collapse to one line.
	assert.deepEqual(describeCall("read", { path: "src/index.ts", brief: "  查看\n入口   实现  " }), { brief: "查看 入口 实现" });
	assert.equal(briefFromArgs("read", { path: "src/index.ts", brief: "查看入口实现" }), "查看入口实现");
});

test("a missing or blank brief falls back to a structured description", () => {
	const expected = { brief: "reading", detail: "src/index.ts" };
	assert.deepEqual(describeCall("read", { path: "src/index.ts" }), expected);
	assert.deepEqual(describeCall("read", { path: "src/index.ts", brief: "" }), expected);
	assert.deepEqual(describeCall("read", { path: "src/index.ts", brief: "   " }), expected);
	assert.deepEqual(describeCall("read", { path: "src/index.ts" }, "zh"), { brief: "读取", detail: "src/index.ts" });
	assert.equal(briefFromArgs("ls", undefined), "listing › .");
	// The purpose and the raw target stay separate pieces of information.
	assert.deepEqual(describeCall("bash", { command: "git status" }), { brief: "checking git status", detail: "git status" });
});

test("an overlong brief is clipped to one row", () => {
	const result = briefFromArgs("read", { path: "src/index.ts", brief: "a".repeat(200) });
	assert.equal(result.length, BRIEF_MAX_CHARS);
	assert.ok(result.endsWith("…"));
});

test("error excerpts stay on one diagnosable line", () => {
	assert.equal(
		errorExcerpt({ content: [{ type: "text", text: "  boom\n  failed   here " }] }),
		"boom failed here",
	);
	assert.equal(errorExcerpt({ content: [] }), undefined);
	assert.equal(errorExcerpt(undefined), undefined);
	const long = errorExcerpt({ content: [{ type: "text", text: "x".repeat(400) }] }, 100);
	assert.equal(long?.length, 100);
});
