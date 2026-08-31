import test from "node:test";
import assert from "node:assert/strict";
import { isAlreadyCondensedThinking, resolveThinkingPresentation, thinkingBrief } from "../src/thinking.ts";

test("visible keeps native thinking in every state", () => {
	assert.equal(resolveThinkingPresentation("visible", { settled: false, expanded: false }), "native");
	assert.equal(resolveThinkingPresentation("visible", { settled: true, expanded: false }), "native");
	assert.equal(resolveThinkingPresentation("visible", { settled: true, expanded: true }), "native");
});

test("compact keeps the thinking process visible while its message streams", () => {
	assert.equal(resolveThinkingPresentation("compact", { streaming: true, settled: false, expanded: false }), "native");
});

test("compact folds thinking into a brief the moment the message completes", () => {
	assert.equal(resolveThinkingPresentation("compact", { streaming: false, settled: false, expanded: false }), "brief");
	assert.equal(resolveThinkingPresentation("compact", { streaming: false, settled: true, expanded: false }), "brief");
});

test("collapse condenses thinking to a brief during the run and collapses when settled", () => {
	assert.equal(resolveThinkingPresentation("collapse", { streaming: true, settled: false, expanded: false }), "brief");
	assert.equal(resolveThinkingPresentation("collapse", { streaming: false, settled: false, expanded: false }), "brief");
	assert.equal(resolveThinkingPresentation("collapse", { streaming: false, settled: true, expanded: false }), "collapsed");
});

test("expansion restores native thinking in compact and collapse", () => {
	assert.equal(resolveThinkingPresentation("compact", { streaming: true, settled: false, expanded: true }), "native");
	assert.equal(resolveThinkingPresentation("compact", { streaming: false, settled: true, expanded: true }), "native");
	assert.equal(resolveThinkingPresentation("collapse", { streaming: false, settled: false, expanded: true }), "native");
	assert.equal(resolveThinkingPresentation("collapse", { streaming: false, settled: true, expanded: true }), "native");
});

test("hidden leaves a stub and expands to native", () => {
	assert.equal(resolveThinkingPresentation("hidden", { streaming: true, settled: false, expanded: false }), "hiddenStub");
	assert.equal(resolveThinkingPresentation("hidden", { streaming: false, settled: true, expanded: false }), "hiddenStub");
	assert.equal(resolveThinkingPresentation("hidden", { streaming: false, settled: true, expanded: true }), "native");
});

test("recognizes already-condensed provider summaries", () => {
	assert.equal(isAlreadyCondensedThinking("**Auditing the renderer**\n\n**Checking the result path**"), true);
	assert.equal(isAlreadyCondensedThinking("**Auditing the renderer**\nDetails about the renderer follow."), false);
	assert.equal(isAlreadyCondensedThinking("x".repeat(81)), false);
});

test("thinkingBrief uses the first meaningful line", () => {
	assert.equal(thinkingBrief("\n\n**Planning the smoke test**\ndetails here", "… thinking"), "… Planning the smoke test");
	assert.equal(thinkingBrief("先分析目录结构，再决定改动范围。", "… 思考过程"), "… 先分析目录结构，再决定改动范围。");
});

test("thinkingBrief strips light markdown decoration", () => {
	assert.equal(thinkingBrief("# Heading\nbody", "… thinking"), "… Heading");
	assert.equal(thinkingBrief("- bullet point", "… thinking"), "… bullet point");
	assert.equal(thinkingBrief("**bold** and `code`", "… thinking"), "… bold and code");
});

test("thinkingBrief truncates long first lines", () => {
	const long = "x".repeat(200);
	const brief = thinkingBrief(long, "… thinking");
	assert.equal(brief, `… ${"x".repeat(80)}…`);
	assert.ok(brief.length <= 83);
});

test("thinkingBrief falls back when no meaningful line exists", () => {
	assert.equal(thinkingBrief("", "… thinking"), "… thinking");
	assert.equal(thinkingBrief("   \n  \n", "… thinking"), "… thinking");
});
