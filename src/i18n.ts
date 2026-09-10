import type { Locale, ResolvedLocale } from "./types.ts";

export const DEFAULT_LOCALE: Locale = "auto";

const SUPPORTED_LOCALES = new Set<Locale>(["en", "zh", "auto"]);

export function isLocale(value: unknown): value is Locale {
	return typeof value === "string" && SUPPORTED_LOCALES.has(value as Locale);
}

export function detectSystemLocale(): ResolvedLocale {
	const env = (process.env.LANG ?? "") + " " + (process.env.LC_ALL ?? "") + " " + (process.env.LC_MESSAGES ?? "") + " " + (process.env.LANGUAGE ?? "");
	return env.toLowerCase().includes("zh") ? "zh" : "en";
}

export function resolveLocale(config: { locale: Locale }): ResolvedLocale {
	if (config.locale === "en" || config.locale === "zh") return config.locale;
	return detectSystemLocale();
}

const terseLabels: Record<ResolvedLocale, { on: string; off: string }> = {
	en: { on: "terse on", off: "terse off" },
	zh: { on: "精简模式 开", off: "精简模式 关" },
};

export function terseLabel(locale: ResolvedLocale, terse: boolean): string {
	return terse ? terseLabels[locale].on : terseLabels[locale].off;
}

export function notifyToggled(locale: ResolvedLocale, terse: boolean): string {
	if (locale === "zh") {
		return terse
			? "pi-briefly：精简模式已开启（工具输出折叠为一行；Ctrl+O 展开，再执行 /briefly 关闭）"
			: "pi-briefly：精简模式已关闭（恢复原生显示）";
	}
	return terse
		? "pi-briefly: terse mode on (tool output folded into one line; Ctrl+O expands, run /briefly again to turn it off)"
		: "pi-briefly: terse mode off (native presentation restored)";
}

export function notifyCurrent(locale: ResolvedLocale, terse: boolean): string {
	return locale === "zh"
		? `当前 pi-briefly：${terseLabel(locale, terse)}`
		: `pi-briefly is ${terseLabel(locale, terse)}`;
}

export function notifyReloaded(locale: ResolvedLocale, terse: boolean): string {
	return locale === "zh"
		? `pi-briefly 已重载（${terseLabel(locale, terse)}）`
		: `pi-briefly reloaded (${terseLabel(locale, terse)})`;
}

export function notifyLocale(locale: ResolvedLocale, next: Locale): string {
	return locale === "zh" ? `语言已设置为 ${next}` : `Locale set to ${next}`;
}

export function notifyUsage(locale: ResolvedLocale): string {
	return locale === "zh"
		? "用法：/briefly 切换精简模式 · on|off · show · reload · locale <auto|en|zh>"
		: "Usage: /briefly toggles terse mode · on|off · show · reload · locale <auto|en|zh>";
}

export type TranscriptNavigationPosition = "bottom" | "middle" | "prompt";

export function getTranscriptNavigationPill(
	locale: ResolvedLocale,
	promptKey: string,
	bottomKey: string,
	position: TranscriptNavigationPosition = "middle",
): string {
	if (position === "bottom") {
		return locale === "zh" ? `跳到 prompt（${promptKey}）↑` : `Jump to prompt (${promptKey}) ↑`;
	}
	if (position === "prompt") {
		return locale === "zh" ? `跳到底部（${bottomKey}）↓` : `Jump to bottom (${bottomKey}) ↓`;
	}
	return locale === "zh"
		? `跳到 prompt（${promptKey}）↑  ·  跳到底部（${bottomKey}）↓`
		: `Jump to prompt (${promptKey}) ↑  ·  Jump to bottom (${bottomKey}) ↓`;
}

export function workingMessage(locale: ResolvedLocale, elapsed: string): string {
	return locale === "zh" ? `执行中... (${elapsed})` : `Working... (${elapsed})`;
}
