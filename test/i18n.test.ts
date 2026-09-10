import test from "node:test";
import assert from "node:assert/strict";
import {
	getTranscriptNavigationPill,
	notifyCurrent,
	notifyLocale,
	notifyReloaded,
	notifyToggled,
	notifyUsage,
	resolveLocale,
	terseLabel,
	workingMessage,
} from "../src/i18n.ts";

test("resolves explicit and automatic locales", () => {
	assert.equal(resolveLocale({ locale: "zh" }), "zh");
	assert.equal(resolveLocale({ locale: "en" }), "en");
	assert.ok(["en", "zh"].includes(resolveLocale({ locale: "auto" })));
});

test("labels the single switch in both languages", () => {
	assert.equal(terseLabel("zh", true), "精简模式 开");
	assert.equal(terseLabel("zh", false), "精简模式 关");
	assert.equal(terseLabel("en", true), "terse on");
	assert.equal(terseLabel("en", false), "terse off");
});

test("notifications describe the switch state", () => {
	assert.match(notifyToggled("zh", true), /精简模式已开启/);
	assert.match(notifyToggled("zh", false), /精简模式已关闭/);
	assert.match(notifyToggled("en", true), /terse mode on/);
	assert.match(notifyToggled("en", false), /native presentation restored/);
	assert.match(notifyCurrent("zh", true), /精简模式 开/);
	assert.match(notifyReloaded("en", false), /terse off/);
	assert.match(notifyLocale("zh", "en"), /语言已设置为 en/);
	assert.match(notifyUsage("en"), /\/briefly/);
});

test("keeps the fullscreen navigation pill", () => {
	assert.equal(getTranscriptNavigationPill("zh", "Ctrl+\\", "Ctrl+]", "bottom"), "跳到 prompt（Ctrl+\\）↑");
	assert.equal(getTranscriptNavigationPill("zh", "Ctrl+\\", "Ctrl+]", "prompt"), "跳到底部（Ctrl+]）↓");
	assert.equal(
		getTranscriptNavigationPill("en", "Ctrl+\\", "Ctrl+]", "middle"),
		"Jump to prompt (Ctrl+\\) ↑  ·  Jump to bottom (Ctrl+]) ↓",
	);
	assert.equal(workingMessage("zh", "1 分钟"), "执行中... (1 分钟)");
});
