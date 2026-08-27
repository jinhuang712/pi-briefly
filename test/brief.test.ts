import test from "node:test";
import assert from "node:assert/strict";
import { compactCallParts, compactResultSummary, excerpt, summarizeCommand, toolBrief } from "../src/brief.ts";

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
	assert.equal(toolBrief("bash", { command: "git status" }), "bash checking git status git status");
	assert.equal(toolBrief("read", { path: "src/index.ts" }), "read reading src/index.ts");
	assert.equal(toolBrief("write", { path: "src/index.ts" }), "write writing src/index.ts");
	assert.equal(
		toolBrief("bash", { command: "printf 'elapsed-time test complete\\n'" }),
		"bash printing elapsed-time test complete printf 'elapsed-time test complete'",
	);
});

test("localizes compact purposes and result summaries", () => {
	assert.equal(summarizeCommand("git status --short", "zh"), "检查 Git 状态");
	assert.equal(compactCallParts("read", { path: "src/index.ts" }, "zh").purpose, "读取");
	assert.equal(compactCallParts("find", { pattern: "*.ts" }, "zh").purpose, "查找文件");
	assert.equal(compactCallParts("edit", { path: "src/i18n.ts" }, "en").purpose, "resolving locale");
	assert.equal(
		compactResultSummary("write", { content: "一\n二" }, { content: [] }, "zh"),
		"已写入 2 行 · 3 字符",
	);
	assert.equal(
		compactResultSummary("grep", undefined, { content: [{ type: "text", text: "a\nb" }] }, "zh"),
		"找到 2 个匹配项",
	);
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
