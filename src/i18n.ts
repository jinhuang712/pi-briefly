import type { BrieflyConfig, Locale, PresetMode, ResolvedLocale } from "./types.ts";

export const DEFAULT_LOCALE: Locale = "auto";

const SUPPORTED_LOCALES = new Set<Locale>(["en", "zh", "auto"]);

export function isLocale(value: unknown): value is Locale {
	return typeof value === "string" && SUPPORTED_LOCALES.has(value as Locale);
}

export function detectSystemLocale(): ResolvedLocale {
	const env = (process.env.LANG ?? "") + " " + (process.env.LC_ALL ?? "") + " " + (process.env.LC_MESSAGES ?? "") + " " + (process.env.LANGUAGE ?? "");
	return env.toLowerCase().includes("zh") ? "zh" : "en";
}

export function resolveLocale(config: BrieflyConfig): ResolvedLocale {
	if (config.locale === "en" || config.locale === "zh") return config.locale;
	return detectSystemLocale();
}

const modeDescriptions: Record<ResolvedLocale, Record<PresetMode, string>> = {
	en: {
		visible: "Full native",
		compact: "Compact summary + Took",
		collapse: "Fold after run",
		hidden: "No UI",
	},
	zh: {
		visible: "完整原生",
		compact: "紧凑摘要",
		collapse: "完成后折叠",
		hidden: "完全隐藏",
	},
};

const selectorTitle: Record<ResolvedLocale, string> = {
	en: "pi-briefly mode",
	zh: "pi-briefly 模式",
};

const collapsedThinkingLabel: Record<ResolvedLocale, string> = {
	en: "… intermediate steps collapsed",
	zh: "… 中间步骤已折叠",
};

export function getModeDescription(locale: ResolvedLocale, mode: PresetMode): string {
	return modeDescriptions[locale][mode];
}

export function getSelectorTitle(locale: ResolvedLocale): string {
	return selectorTitle[locale];
}

export function getCollapsedThinkingLabel(locale: ResolvedLocale): string {
	return collapsedThinkingLabel[locale];
}

export function notifyReloaded(locale: ResolvedLocale, mode: PresetMode): string {
	return locale === "zh" ? `pi-briefly 已重载为 ${mode} 模式` : `pi-briefly reloaded in ${mode} mode`;
}

export function notifyReset(locale: ResolvedLocale): string {
	return locale === "zh" ? "pi-briefly 已重置为 visible 模式" : "pi-briefly reset to visible mode";
}

export function notifyModeChanged(locale: ResolvedLocale, mode: PresetMode): string {
	return locale === "zh" ? `pi-briefly 模式：${mode}` : `pi-briefly mode: ${mode}`;
}

export function notifyCurrentMode(locale: ResolvedLocale, mode: PresetMode): string {
	return locale === "zh" ? `当前 pi-briefly 模式：${mode}` : `Current pi-briefly mode: ${mode}`;
}

export function workingMessage(locale: ResolvedLocale, elapsed: string): string {
	return locale === "zh" ? `执行中... (${elapsed})` : `Working... (${elapsed})`;
}
