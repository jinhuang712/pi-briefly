import test from "node:test";
import assert from "node:assert/strict";
import {
	getCollapsedThinkingLabel,
	getCommonFeatures,
	getCurrentModeSuffix,
	getModeDescription,
	getSelectorTitle,
	getThinkingBriefLabel,
	notifyModeChanged,
	resolveLocale,
	workingMessage,
} from "../src/i18n.ts";

test("resolves explicit locales and translates UI labels", () => {
	const config = { version: 1 as const, mode: "compact" as const, locale: "zh" as const };
	assert.equal(resolveLocale(config), "zh");
	assert.equal(getSelectorTitle("zh"), "pi-briefly 模式");
	assert.equal(getCurrentModeSuffix("zh"), "（当前）");
	assert.equal(getCurrentModeSuffix("en"), "(current)");
	assert.equal(getModeDescription("zh", "compact"), "紧凑摘要");
	assert.equal(getCommonFeatures("zh"), "通用：\n  执行中... (1 分钟 53 秒)\n  耗时 3 秒 · 消耗 12.3k tokens");
	assert.equal(getCollapsedThinkingLabel("zh"), "… 中间步骤已折叠");
	assert.equal(getThinkingBriefLabel("zh"), "… 思考过程");
	assert.equal(workingMessage("zh", "1 分钟"), "执行中... (1 分钟)");
	assert.equal(notifyModeChanged("zh", "compact"), "pi-briefly 模式：compact");
});

test("keeps English as the explicit fallback locale", () => {
	const config = { version: 1 as const, mode: "visible" as const, locale: "en" as const };
	assert.equal(resolveLocale(config), "en");
	assert.equal(getModeDescription("en", "visible"), "Full native");
	assert.equal(getCommonFeatures("en"), "Common:\n  Working... (1 minute 53 seconds)\n  Took 3 seconds · spent 12.3k tokens");
});
