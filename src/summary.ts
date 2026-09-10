import type { ResolvedLocale } from "./types.ts";

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

/**
 * Compact per-tool-call duration for the one-line row, in Pi's native
 * `Took 0.4s` style rather than the verbose turn-duration wording.
 */
export function formatCallDuration(milliseconds: number): string {
	const value = Math.max(0, milliseconds);
	if (value < 10_000) return `${(value / 1000).toFixed(1)}s`;
	const totalSeconds = Math.round(value / 1000);
	if (totalSeconds < 60) return `${totalSeconds}s`;
	const minutes = Math.floor(totalSeconds / 60);
	if (minutes < 60) return `${minutes}m ${String(totalSeconds % 60).padStart(2, "0")}s`;
	return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}
