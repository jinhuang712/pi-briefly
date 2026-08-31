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
		compact: "Compact summary",
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

const thinkingBriefLabel: Record<ResolvedLocale, string> = {
	en: "… thinking",
	zh: "… 思考过程",
};

export function getModeDescription(locale: ResolvedLocale, mode: PresetMode): string {
	return modeDescriptions[locale][mode];
}

export function getCommonFeatures(locale: ResolvedLocale): string {
	return locale === "zh"
		? "通用：\n  执行中... (1 分钟 53 秒)\n  耗时 3 秒 · 消耗 12.3k tokens"
		: "Common:\n  Working... (1 minute 53 seconds)\n  Took 3 seconds · spent 12.3k tokens";
}

export function getTranscriptNavigationFeatures(locale: ResolvedLocale, promptKey: string, bottomKey: string): string {
	return locale === "zh"
		? `转录（全屏）：\n  ${promptKey} 跳到 prompt\n  ${bottomKey} 跳到底部`
		: `Transcript (fullscreen):\n  ${promptKey} jump to prompt\n  ${bottomKey} jump to bottom`;
}

export type TranscriptNavigationPosition = "bottom" | "middle" | "prompt";

export function getTranscriptNavigationPill(
	locale: ResolvedLocale,
	promptKey: string,
	bottomKey: string,
	position: TranscriptNavigationPosition = "middle",
): string {
	const actions =
		position === "bottom"
			? locale === "zh"
				? `跳到 prompt（${promptKey}）↑`
				: `Jump to prompt (${promptKey}) ↑`
			: position === "prompt"
				? locale === "zh"
					? `跳到底部（${bottomKey}）↓`
					: `Jump to bottom (${bottomKey}) ↓`
				: locale === "zh"
					? `跳到 prompt（${promptKey}）↑  ·  跳到底部（${bottomKey}）↓`
					: `Jump to prompt (${promptKey}) ↑  ·  Jump to bottom (${bottomKey}) ↓`;
	return actions;
}

export function getTranscriptNavigationHint(
	locale: ResolvedLocale,
	promptKey: string,
	bottomKey: string,
	position: TranscriptNavigationPosition = "middle",
): string {
	const actions =
		position === "bottom"
			? locale === "zh"
				? `${promptKey} 跳到 prompt`
				: `${promptKey} jump to prompt`
			: position === "prompt"
				? locale === "zh"
					? `${bottomKey} 跳到底部`
					: `${bottomKey} jump to bottom`
				: locale === "zh"
					? `${promptKey} 跳到 prompt · ${bottomKey} 跳到底部`
					: `${promptKey} jump to prompt · ${bottomKey} jump to bottom`;
	return locale === "zh" ? `全屏转录：${actions}` : `Fullscreen transcript: ${actions}`;
}

export function getSelectorTitle(locale: ResolvedLocale): string {
	return selectorTitle[locale];
}

const currentModeSuffix: Record<ResolvedLocale, string> = {
	en: "(current)",
	zh: "（当前）",
};

export function getCurrentModeSuffix(locale: ResolvedLocale): string {
	return currentModeSuffix[locale];
}

export function getCollapsedThinkingLabel(locale: ResolvedLocale): string {
	return collapsedThinkingLabel[locale];
}

export function getThinkingBriefLabel(locale: ResolvedLocale): string {
	return thinkingBriefLabel[locale];
}

const hiddenThinkingStub: Record<ResolvedLocale, string> = {
	en: "… hidden",
	zh: "… 已隐藏",
};

export function getHiddenThinkingStub(locale: ResolvedLocale): string {
	return hiddenThinkingStub[locale];
}

const hiddenToolsSummary: Record<ResolvedLocale, (count: number) => string> = {
	en: (count) => `… ${count} step${count === 1 ? "" : "s"} hidden`,
	zh: (count) => `… 已隐藏 ${count} 个步骤`,
};

export function getHiddenToolsSummary(locale: ResolvedLocale, count: number): string {
	return hiddenToolsSummary[locale](count);
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
