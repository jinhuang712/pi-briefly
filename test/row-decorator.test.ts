import test from "node:test";
import assert from "node:assert/strict";
import { Text } from "@earendil-works/pi-tui";
import { briefFromArgs } from "../src/brief.ts";
import type { RenderContext } from "../src/native-decorator.ts";
import { installToolRowDecoratorHub, readToolRowDecoratorHub, TOOL_ROW_DECORATOR_KEY } from "../src/row-decorator.ts";
import type { BrieflyConfig } from "../src/types.ts";

const theme = {
	fg: (_name: string, text: string) => text,
	bg: (_name: string, text: string) => text,
	bold: (text: string) => text,
	italic: (text: string) => text,
} as any;

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

function config(terse: boolean, locale: "en" | "zh" = "zh"): BrieflyConfig {
	return { version: 2, terse, locale };
}

test("an external tool hands its row over and gets pi-briefly's terse line", () => {
	const notify = installToolRowDecoratorHub({ config: () => config(true) });
	const hub = readToolRowDecoratorHub();
	assert.ok(hub, "the hub must be published on the shared symbol");

	const decoration = hub.decorate({ tool: "websearch", native: { renderShell: "default" } });
	assert.ok(decoration, "terse mode must decorate");
	assert.equal(decoration.renderShell, "self");
	assert.ok(decoration.renderCall && decoration.renderResult);

	const ctx = context({ query: "pi coding agent", numResults: 5 });
	const row = decoration.renderCall({ query: "pi coding agent", numResults: 5 }, theme, ctx);
	assert.deepEqual(row.render(80), ["· websearch 搜索 › pi coding agent"]);

	decoration.renderResult({ content: [{ type: "text", text: "1. pi" }] }, { isPartial: false }, theme, ctx);
	assert.deepEqual(row.render(80), ["✓ websearch 搜索 › pi coding agent"]);
	notify();
});

test("the decoration is dropped while terse mode is off", () => {
	let terse = false;
	installToolRowDecoratorHub({ config: () => config(terse) });
	const hub = readToolRowDecoratorHub()!;

	assert.equal(hub.decorate({ tool: "websearch" }), undefined);
	terse = true;
	assert.ok(hub.decorate({ tool: "websearch" }));
});

test("subscribers are notified until they unsubscribe", () => {
	const notify = installToolRowDecoratorHub({ config: () => config(true) });
	const calls: number[] = [];
	const unsubscribe = readToolRowDecoratorHub()!.subscribe(() => calls.push(calls.length + 1));

	notify();
	notify();
	assert.deepEqual(calls, [1, 2]);

	unsubscribe();
	notify();
	assert.deepEqual(calls, [1, 2]);
});

test("expanding an external row falls back to the tool's own renderers", () => {
	installToolRowDecoratorHub({ config: () => config(true) });
	const decoration = readToolRowDecoratorHub()!.decorate({
		tool: "view",
		native: { renderCall: () => new Text("NATIVE CALL", 0, 0), renderResult: () => new Text("NATIVE RESULT", 0, 0) },
	})!;

	const ctx = context({ path: "/tmp/a.png" }, { expanded: true });
	const row = decoration.renderCall!(ctx.args, theme, ctx);
	decoration.renderResult!({ content: [] }, { isPartial: false }, theme, ctx);
	const lines = row.render(60).map((line) => line.trim()).filter(Boolean);
	assert.deepEqual(lines, ["NATIVE CALL", "NATIVE RESULT"]);
});

test("an external tool without a result renderer still shows its text when expanded", () => {
	installToolRowDecoratorHub({ config: () => config(true) });
	const decoration = readToolRowDecoratorHub()!.decorate({ tool: "websearch" })!;

	const ctx = context({ query: "pi" }, { expanded: true });
	const row = decoration.renderCall!({ query: "pi" }, theme, ctx);
	decoration.renderResult!({ content: [{ type: "text", text: "first result" }] }, { isPartial: false }, theme, ctx);
	assert.ok(row.render(60).join("\n").includes("first result"), "the result text must not disappear");
});

test("unknown tools fall back to a generic purpose and their target", () => {
	assert.equal(briefFromArgs("websearch", { query: "hi" }, "zh"), "搜索 › hi");
	assert.equal(briefFromArgs("view", { path: "/tmp/a.png" }, "en"), "viewing image › /tmp/a.png");
	assert.equal(briefFromArgs("meegle", { action: "list" }, "zh"), "调用 › list");
	assert.equal(briefFromArgs("meegle", {}, "zh"), "调用");
});

test("the tool owner's own wording outranks pi-briefly's table", () => {
	// `search` and `fetch` are generic names: only their owner knows what they
	// search or fetch, so the owner declares the verb and pi-briefly just draws it.
	assert.equal(briefFromArgs("search", { query: "pi" }, "zh", { en: "searching the web", zh: "联网搜索" }), "联网搜索 › pi");
	assert.equal(briefFromArgs("fetch", { url: "https://pi.dev" }, "en", { en: "fetching a page", zh: "抓取页面" }), "fetching a page › https://pi.dev");
	// The declared wording still loses to a description the model wrote itself.
	assert.equal(briefFromArgs("search", { query: "pi", brief: "查文档" }, "zh", { en: "searching the web", zh: "联网搜索" }), "查文档");
});

test("the hub passes declared wording through to the row", () => {
	installToolRowDecoratorHub({ config: () => config(true, "zh") });
	const hub = readToolRowDecoratorHub()!;
	const decoration = hub.decorate({ tool: "search", purpose: { en: "searching the web", zh: "联网搜索" } })!;
	const ctx = context({ query: "pi coding agent" });
	const row = decoration.renderCall!({ query: "pi coding agent" }, theme, ctx);
	assert.deepEqual(row.render(80), ["· search 联网搜索 › pi coding agent"]);
});

test("the hub symbol is the versioned contract other extensions code against", () => {
	assert.equal(TOOL_ROW_DECORATOR_KEY, Symbol.for("pi.toolRowDecorator.v1"));
	assert.equal((globalThis as Record<PropertyKey, unknown>)[TOOL_ROW_DECORATOR_KEY], readToolRowDecoratorHub());
});
