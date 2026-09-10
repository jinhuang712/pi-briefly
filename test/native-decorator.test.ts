import test from "node:test";
import assert from "node:assert/strict";
import { Text, visibleWidth } from "@earendil-works/pi-tui";
import { renderToolCall, renderToolResult, type RenderContext } from "../src/native-decorator.ts";

// A pass-through theme keeps assertions readable: every styled fragment is
// returned verbatim, so the rendered line can be compared directly.
const theme = {
	fg: (_name: string, text: string) => text,
	bg: (_name: string, text: string) => text,
	bold: (text: string) => text,
	italic: (text: string) => text,
} as any;

// Marks the modifiers so the typographic hierarchy itself can be asserted.
const markedTheme = {
	fg: (_name: string, text: string) => text,
	bg: (_name: string, text: string) => text,
	bold: (text: string) => `B[${text}]`,
	italic: (text: string) => `I[${text}]`,
} as any;

const options = {} as any;

/**
 * Defaults describe a replayed row: nothing is executing, so no per-call clock
 * runs. Timing has its own tests below.
 */
function context(args: Record<string, unknown>, overrides: Partial<RenderContext> = {}): RenderContext {
	return {
		args,
		toolCallId: "call-1",
		invalidate: () => {},
		state: {},
		cwd: "/tmp",
		executionStarted: false,
		argsComplete: true,
		isPartial: false,
		expanded: false,
		showImages: false,
		isError: false,
		...overrides,
	};
}

test("terse renders exactly one line carrying the model brief", () => {
	const ctx = context({ path: "src/index.ts", brief: "查看入口实现" });
	const component = renderToolCall("read", undefined, ctx.args, theme, ctx, "terse", "zh");
	assert.deepEqual(component.render(80), ["· read 查看入口实现"]);
});

test("bold names the tool and italic marks timing and raw targets", () => {
	const ctx = context({ command: "ls", brief: "" }, { executionStarted: true, isPartial: true });
	const line = renderToolCall("bash", undefined, ctx.args, markedTheme, ctx, "terse", "en").render(200)[0];
	assert.match(line, /^· B\[bash\] I\[\([\d.]+s\)\] listing files › I\[ls\]$/);
});

test("the status mark flips to a check once the call finishes", () => {
	const ctx = context({ path: "src/index.ts", brief: "查看入口实现" });
	const call = renderToolCall("read", undefined, ctx.args, theme, ctx, "terse", "zh");
	assert.match(call.render(80)[0], /^· read/);

	const resultSlot = renderToolResult("read", undefined, { content: [{ type: "text", text: "ok" }] }, options, theme, ctx, "terse");
	assert.deepEqual(resultSlot.render(80), []);
	assert.deepEqual(call.render(80), ["✓ read 查看入口实现"]);
});

test("a failed call stays diagnosable on one extra line", () => {
	const ctx = context({ command: "false", brief: "探测失败" });
	const call = renderToolCall("bash", undefined, ctx.args, theme, ctx, "terse", "zh");
	renderToolResult(
		"bash",
		undefined,
		{ content: [{ type: "text", text: "boom\nbad  thing" }] },
		options,
		theme,
		{ ...ctx, isError: true },
		"terse",
	);
	assert.deepEqual(call.render(80), ["✗ bash 探测失败", "│ boom bad thing"]);
});

test("terse falls back to the heuristic when the model sends no brief", () => {
	const ctx = context({ path: "src/index.ts" });
	assert.deepEqual(renderToolCall("read", undefined, ctx.args, theme, ctx, "terse", "zh").render(80), [
		"· read 读取 › src/index.ts",
	]);
	assert.deepEqual(renderToolCall("ls", undefined, {}, theme, context({}), "terse", "en").render(80), ["· ls listing › ."]);
});

test("terse never wraps onto a second line", () => {
	const ctx = context({ path: "a.ts", brief: "x".repeat(200) });
	const lines = renderToolCall("read", undefined, ctx.args, theme, ctx, "terse", "zh").render(40);
	assert.equal(lines.length, 1);
	// truncateToWidth inserts ANSI resets, so compare visible width.
	assert.ok(visibleWidth(lines[0]) <= 40, `expected <= 40 columns, got ${visibleWidth(lines[0])}`);
});

test("the timing sits in front of the brief and keeps moving while the call runs", () => {
	const ctx = context({ command: "sleep 1", brief: "等待完成" }, { executionStarted: true, isPartial: true });
	const call = renderToolCall("bash", undefined, ctx.args, theme, ctx, "terse", "zh");
	assert.match(call.render(80)[0], /^· bash \(\d+\.\ds\) 等待完成$/);

	// Partial results arrive while the tool still runs: keep counting.
	renderToolResult("bash", undefined, { content: [{ type: "text", text: "waiting" }] }, { isPartial: true } as any, theme, ctx, "terse");
	assert.match(call.render(80)[0], /^· bash \(\d+\.\ds\) 等待完成$/);

	renderToolResult("bash", undefined, { content: [{ type: "text", text: "done" }] }, { isPartial: false } as any, theme, ctx, "terse");
	assert.match(call.render(80)[0], /^✓ bash \(\d+\.\ds\) 等待完成$/);
});

test("a replayed call shows no timing instead of a fake duration", () => {
	const ctx = context({ path: "a.ts", brief: "查看实现" }, { executionStarted: false });
	const call = renderToolCall("read", undefined, ctx.args, theme, ctx, "terse", "zh");
	renderToolResult("read", undefined, { content: [{ type: "text", text: "ok" }] }, { isPartial: false } as any, theme, ctx, "terse");
	assert.deepEqual(call.render(80), ["✓ read 查看实现"]);
});

test("a streaming result keeps the mark pending until the call completes", () => {
	const ctx = context({ command: "sleep 6", brief: "等待六秒" }, { isPartial: true });
	const call = renderToolCall("bash", undefined, ctx.args, theme, ctx, "terse", "zh");

	// Partial results arrive while the tool is still running: the row must not
	// claim success yet.
	renderToolResult("bash", undefined, { content: [{ type: "text", text: "waiting" }] }, { isPartial: true } as any, theme, ctx, "terse");
	assert.deepEqual(call.render(80), ["· bash 等待六秒"]);

	renderToolResult("bash", undefined, { content: [{ type: "text", text: "done" }] }, { isPartial: false } as any, theme, ctx, "terse");
	assert.deepEqual(call.render(80), ["✓ bash 等待六秒"]);
});

test("native presentation keeps Pi's own renderers and reuses the row", () => {
	const ctx = context({ path: "src/index.ts" });
	const callArgs: unknown[] = [];
	const callRenderer = (args: unknown) => {
		callArgs.push(args);
		return new Text("NATIVE CALL", 0, 0);
	};
	const row = renderToolCall("read", callRenderer as any, ctx.args, theme, ctx, "native", "en");
	assert.deepEqual(row.render(40).map((line) => line.trim()).filter(Boolean), ["NATIVE CALL"]);
	assert.equal(callArgs.length, 1);

	// The result slot returns an empty component: the row returned by the call
	// slot owns both halves, which avoids rendering the row twice.
	const resultSlot = renderToolResult("read", (() => new Text("NATIVE RESULT", 0, 0)) as any, { content: [] }, options, theme, ctx, "native");
	assert.deepEqual(resultSlot.render(40), []);
	assert.ok(row.render(40).join("\n").includes("NATIVE RESULT"));
});

test("rows keep one instance per tool call across re-renders", () => {
	const ctx = context({ path: "a.ts", brief: "第一版" });
	const first = renderToolCall("read", undefined, ctx.args, theme, ctx, "terse", "zh");
	ctx.args = { path: "a.ts", brief: "更新版" };
	const second = renderToolCall("read", undefined, ctx.args, theme, ctx, "terse", "zh");
	assert.equal(first, second);
	assert.deepEqual(second.render(80), ["· read 更新版"]);
});
