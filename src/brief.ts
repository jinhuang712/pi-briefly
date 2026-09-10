import { BRIEF_PARAMETER, type ResolvedLocale, type ToolName } from "./types.ts";

/**
 * The model is asked for at most this many characters. The terse row also
 * clips to this length so a chatty model cannot wrap the row onto a second
 * line.
 */
export const BRIEF_MAX_CHARS = 80;

export interface ToolResultLike {
	content?: Array<{ type?: string; text?: string }>;
	details?: unknown;
	isError?: boolean;
}

export function shorten(value: string, maxLength = 100): string {
	if (value.length <= maxLength) return value;
	const headLength = Math.ceil((maxLength - 3) * 0.7);
	const tailLength = maxLength - 3 - headLength;
	return `${value.slice(0, headLength)}...${value.slice(-tailLength)}`;
}

function clip(value: string, maxLength: number): string {
	if (value.length <= maxLength) return value;
	return `${value.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
}

export function normalizedCommand(command: string): string {
	return command.replace(/\s+/g, " ").trim();
}

export function commandLabel(command: string): string | undefined {
	const match = /(?:printf|echo)\s+(?:-[^-\s]+\s+)?(["'])(.*?)\1/i.exec(command);
	if (!match?.[2]) return undefined;
	const label = match[2]
		.replace(/%[-+#0-9.*]*[a-zA-Z]/g, " ")
		.replace(/\\[nrt]/g, " ")
		.replace(/\\([\\'"$])/g, "$1")
		.replace(/\s+at\s+depth\b.*$/i, "")
		.replace(/\s*:\s*$/, "")
		.replace(/\s+/g, " ")
		.trim();
	return label || undefined;
}

export function summarizeCommand(command: string, locale: ResolvedLocale = "en"): string {
	const normalized = normalizedCommand(command);
	const lower = normalized.toLowerCase();
	const label = commandLabel(normalized);
	if (locale === "zh") {
		if (/\bfind(?:\s|$)/.test(lower)) return `查找${label ?? "文件"}`;
		if (/\b(?:rg|grep)(?:\s|$)/.test(lower)) return label ? `搜索 ${label}` : "搜索文本";
		if (/\b(?:ls|exa|tree)(?:\s|$)/.test(lower)) return "列出文件";
		if (/\b(?:cat|head|tail|sed|awk)(?:\s|$)/.test(lower)) return "读取文件内容";
		if (/\bwc(?:\s|$)/.test(lower)) return "统计行数";
		if (/\bgit\b.*\bstatus\b/.test(lower)) return "检查 Git 状态";
		if (/\bgit\b.*\bdiff\b/.test(lower)) return "检查 Git 变更";
		if (/\bgit\b.*\blog\b/.test(lower)) return "查看 Git 历史";
		if (/\bpwd(?:\s|$)/.test(lower)) return "检查当前目录";
		if (/\b(?:npm|pnpm|yarn|bun)(?:\s|$)/.test(lower)) return "运行包管理命令";
		if (label) return `打印 ${label}`;
		return "运行 Shell 命令";
	}
	if (/\bfind(?:\s|$)/.test(lower)) return `finding ${label ?? "files"}`;
	if (/\b(?:rg|grep)(?:\s|$)/.test(lower)) return label ? `searching for ${label}` : "searching text";
	if (/\b(?:ls|exa|tree)(?:\s|$)/.test(lower)) return "listing files";
	if (/\b(?:cat|head|tail|sed|awk)(?:\s|$)/.test(lower)) return "reading file contents";
	if (/\bwc(?:\s|$)/.test(lower)) return "counting lines";
	if (/\bgit\b.*\bstatus\b/.test(lower)) return "checking git status";
	if (/\bgit\b.*\bdiff\b/.test(lower)) return "checking git changes";
	if (/\bgit\b.*\blog\b/.test(lower)) return "checking git history";
	if (/\bpwd(?:\s|$)/.test(lower)) return "checking the current directory";
	if (/\b(?:npm|pnpm|yarn|bun)(?:\s|$)/.test(lower)) return "running a package command";
	if (label) return `printing ${label}`;
	return "running a shell command";
}

export interface CallParts {
	purpose: string;
	detail: string;
}

function isLocaleRelated(args: Record<string, unknown>): boolean {
	try {
		const hay = JSON.stringify(args).toLowerCase();
		return hay.includes("locale") || hay.includes("i18n");
	} catch {
		return false;
	}
}

function filePurpose(tool: "read" | "write" | "edit", args: Record<string, unknown>, locale: ResolvedLocale): string {
	const path = typeof args.path === "string" ? args.path.toLowerCase() : "";
	const zh = locale === "zh";
	if (isLocaleRelated(args)) {
		if (tool === "write") return zh ? "国际化" : "localizing";
		return zh ? "处理 locale" : "resolving locale";
	}
	if (/readme|docs?|specs?/.test(path)) {
		if (tool === "read") return zh ? "查看文档" : "reviewing docs";
		return zh ? "更新文档" : "updating docs";
	}
	if (/test|spec/.test(path)) return zh ? "更新测试" : "updating tests";
	if (/config|settings/.test(path)) return zh ? "更新配置" : "updating config";
	if (tool === "read") return zh ? "读取" : "reading";
	if (tool === "write") return zh ? "写入" : "writing";
	return zh ? "编辑" : "editing";
}

/**
 * Heuristic purpose/detail derived from the tool arguments. Used only as a
 * fallback: the model is expected to supply its own `brief`.
 */
export function callParts(tool: ToolName, args: Record<string, unknown>, locale: ResolvedLocale = "en"): CallParts {
	switch (tool) {
		case "bash": {
			const command = typeof args.command === "string" ? normalizedCommand(args.command) : "...";
			return { purpose: summarizeCommand(command, locale), detail: clip(command, 60) };
		}
		case "read":
			return { purpose: filePurpose("read", args, locale), detail: shorten(typeof args.path === "string" ? args.path : "...", 100) };
		case "write":
			return { purpose: filePurpose("write", args, locale), detail: shorten(typeof args.path === "string" ? args.path : "...", 100) };
		case "edit":
			return { purpose: filePurpose("edit", args, locale), detail: shorten(typeof args.path === "string" ? args.path : "...", 100) };
		case "find":
			return { purpose: locale === "zh" ? "查找文件" : "finding files", detail: shorten(typeof args.pattern === "string" ? args.pattern : "files", 100) };
		case "grep":
			return { purpose: locale === "zh" ? "搜索文本" : "searching text", detail: shorten(typeof args.pattern === "string" ? args.pattern : "text", 100) };
		case "ls":
			return { purpose: locale === "zh" ? "列出文件" : "listing", detail: shorten(typeof args.path === "string" ? args.path : ".", 100) };
	}
}

export function fallbackBrief(tool: ToolName, args: Record<string, unknown>, locale: ResolvedLocale = "en"): string {
	const parts = callParts(tool, args, locale);
	// The purpose and the concrete target are different kinds of information:
	// keep them visually apart so a raw script is never mistaken for prose.
	return clip([parts.purpose, parts.detail].filter(Boolean).join(" › "), BRIEF_MAX_CHARS);
}

/**
 * The single source of truth for the terse row text: the model's `brief` when
 * present, otherwise the heuristic fallback so the row is never empty.
 */
export function briefFromArgs(tool: ToolName, args: Record<string, unknown> | undefined, locale: ResolvedLocale = "en"): string {
	const input = args ?? {};
	const raw = typeof input[BRIEF_PARAMETER] === "string" ? (input[BRIEF_PARAMETER] as string) : "";
	const brief = raw.replace(/\s+/g, " ").trim();
	if (brief) return clip(brief, BRIEF_MAX_CHARS);
	return fallbackBrief(tool, input, locale);
}

function resultText(result: ToolResultLike | undefined): string {
	return result?.content
		?.filter((item) => item.type === "text" && typeof item.text === "string")
		.map((item) => item.text ?? "")
		.join("\n")
		.trim() ?? "";
}

/**
 * Terse mode hides tool output, but a failure must stay diagnosable: keep one
 * clipped line of the error text.
 */
export function errorExcerpt(result: ToolResultLike | undefined, maxLength = 160): string | undefined {
	const text = resultText(result).replace(/\s+/g, " ").trim();
	return text ? clip(text, maxLength) : undefined;
}
