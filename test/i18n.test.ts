import test from "node:test";
import assert from "node:assert/strict";
import {
	getCollapsedThinkingLabel,
	getModeDescription,
	getSelectorTitle,
	notifyModeChanged,
	resolveLocale,
	workingMessage,
} from "../src/i18n.ts";

test("resolves explicit locales and translates UI labels", () => {
	const config = { version: 1 as const, mode: "compact" as const, locale: "zh" as const };
	assert.equal(resolveLocale(config), "zh");
	assert.equal(getSelectorTitle("zh"), "pi-briefly 模式");
	assert.equal(getModeDescription("zh", "compact"), "紧凑摘要");
	assert.equal(getCollapsedThinkingLabel("zh"), "… 中间步骤已折叠");
	assert.equal(workingMessage("zh", "1 分钟"), "执行中... (1 分钟)");
	assert.equal(notifyModeChanged("zh", "compact"), "pi-briefly 模式：compact");
});

test("keeps English as the explicit fallback locale", () => {
	const config = { version: 1 as const, mode: "visible" as const, locale: "en" as const };
	assert.equal(resolveLocale(config), "en");
	assert.equal(getModeDescription("en", "visible"), "Full native");
});
