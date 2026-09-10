import test from "node:test";
import assert from "node:assert/strict";
import { defaultConfig, parseConfig, setLocale, setTerse } from "../src/config.ts";

test("reads the terse switch and locale", () => {
	assert.deepEqual(parseConfig({ version: 2, terse: true, locale: "zh" }, "s").config, { terse: true, locale: "zh" });
	assert.deepEqual(parseConfig({ terse: false }, "s").config, { terse: false });
	assert.deepEqual(parseConfig({ version: 2, terse: true, locale: "auto" }, "s").warnings, []);
});

test("warns about the removed mode presets and still reads the switch", () => {
	const { config, warnings } = parseConfig({ version: 1, mode: "compact", terse: true }, "/x/pi-briefly.json");
	assert.equal(config.terse, true);
	assert.equal(warnings.length, 1);
	assert.match(warnings[0], /mode/);
	assert.match(warnings[0], /pi-briefly\.json/);
});

test("falls back safely when configuration is invalid", () => {
	assert.match(parseConfig({ version: 7 }, "s").warnings[0], /unsupported version/);
	assert.match(parseConfig({ version: 2, terse: "yes" }, "s").warnings[0], /"terse"/);
	assert.match(parseConfig({ version: 2, locale: "fr" }, "s").warnings[0], /"locale"/);
	assert.match(parseConfig([1, 2], "s").warnings[0], /JSON object/);
	// Invalid values are ignored rather than half-applied.
	assert.deepEqual(parseConfig({ version: 2, terse: "yes" }, "s").config, {});
});

test("setters keep the config shape stable", () => {
	assert.deepEqual(setTerse(defaultConfig, true), { version: 2, terse: true, locale: "auto" });
	assert.deepEqual(setLocale(setTerse(defaultConfig, true), "zh"), { version: 2, terse: true, locale: "zh" });
});
