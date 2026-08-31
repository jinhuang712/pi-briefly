import type { RunStatistics } from "./lifecycle.ts";
import type { ResolvedLocale } from "./types.ts";

export interface ContextSnapshot {
	tokens: number | null;
	percent: number | null;
}

export function formatDuration(milliseconds: number, locale: ResolvedLocale = "en"): string {
	const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
	const days = Math.floor(totalSeconds / 86_400);
	const hours = Math.floor((totalSeconds % 86_400) / 3_600);
	const minutes = Math.floor((totalSeconds % 3_600) / 60);
	const seconds = totalSeconds % 60;
	const parts: string[] = [];
	if (locale === "zh") {
		if (days > 0) parts.push(`${days} 天`);
		if (hours > 0) parts.push(`${hours} 小时`);
		if (minutes > 0) parts.push(`${minutes} 分钟`);
		if (seconds > 0 || parts.length === 0) parts.push(`${seconds} 秒`);
		return parts.join(" ");
	}
	if (days > 0) parts.push(`${days} day${days === 1 ? "" : "s"}`);
	if (hours > 0) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
	if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
	if (seconds > 0 || parts.length === 0) parts.push(`${seconds} second${seconds === 1 ? "" : "s"}`);
	return parts.join(" ");
}

export function formatTook(milliseconds: number, locale: ResolvedLocale = "en", spentTokens?: number | null): string {
	const duration = formatDuration(milliseconds, locale);
	const tokens = spentTokens === undefined || spentTokens === null
		? ""
		: locale === "zh"
			? ` · 消耗 ${formatTokens(spentTokens)} tokens`
			: ` · spent ${formatTokens(spentTokens)} tokens`;
	return locale === "zh" ? `（耗时 ${duration}${tokens}。）` : `(Took ${duration}${tokens}.)`;
}

export function formatTokens(tokens: number | null | undefined): string {
	if (tokens === null || tokens === undefined) return "unknown";
	if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
	if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(tokens >= 100_000 ? 0 : 1).replace(/\.0$/, "")}k`;
	return String(tokens);
}

export function formatCollapseSummary(
	stats: RunStatistics,
	elapsedMilliseconds: number,
	context: ContextSnapshot | undefined,
	spentTokens: number,
	locale: ResolvedLocale = "en",
): string {
	const duration = formatDuration(elapsedMilliseconds, locale);
	if (locale === "zh") {
		const contextText =
			context?.tokens === null || context?.tokens === undefined
				? "上下文未知"
				: `上下文 ${formatTokens(context.tokens)}${context.percent === null || context.percent === undefined ? "" : ` (${Math.round(context.percent)}%)`}`;
		const parts = [
			`耗时 ${duration}`,
			`${stats.toolCalls} 次工具调用`,
			`已读 ${stats.filesRead} 个文件`,
			contextText,
			`消耗 tokens ${formatTokens(spentTokens)}`,
		];
		if (stats.errors > 0) parts.push(`${stats.errors} 个错误`);
		return parts.join(" · ");
	}
	const contextText =
		context?.tokens === null || context?.tokens === undefined
			? "used context unknown"
			: `used context ${formatTokens(context.tokens)}${context.percent === null || context.percent === undefined ? "" : ` (${Math.round(context.percent)}%)`}`;
	const parts = [
		`spent ${duration}`,
		`${stats.toolCalls} tool call${stats.toolCalls === 1 ? "" : "s"}`,
		`${stats.filesRead} file${stats.filesRead === 1 ? "" : "s"} read`,
		contextText,
		`spent tokens ${formatTokens(spentTokens)}`,
	];
	if (stats.errors > 0) parts.push(`${stats.errors} error${stats.errors === 1 ? "" : "s"}`);
	return parts.join(" · ");
}
