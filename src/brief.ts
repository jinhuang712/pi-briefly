import type { ResolvedLocale, ToolName } from "./types.ts";

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

export function normalizedCommand(command: string): string {
	return command.replace(/\s+/g, " ").trim();
}

export function excerpt(value: string, maxLength: number, maxLines: number): string {
	const sourceLines = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
	while (sourceLines.length > 0 && sourceLines[0] === "") sourceLines.shift();
	while (sourceLines.length > 0 && sourceLines[sourceLines.length - 1] === "") sourceLines.pop();
	if (sourceLines.length === 0) return "";
	const lines = sourceLines.slice(0, maxLines);
	let output = shorten(lines.join("\n"), maxLength);
	if (sourceLines.length > maxLines && !output.endsWith("...")) output += "...";
	return output;
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

function compactCommandBrief(command: string): string {
	return shorten(
		normalizedCommand(command)
			.replace(/\\[nrt]/g, "")
			.replace(/\\([\\'"$])/g, "$1"),
		80,
	);
}

export interface CompactCallParts {
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

export function compactCallParts(tool: ToolName, args: Record<string, unknown>, locale: ResolvedLocale = "en"): CompactCallParts {
	switch (tool) {
		case "bash": {
			const command = typeof args.command === "string" ? normalizedCommand(args.command) : "...";
			return { purpose: summarizeCommand(command, locale), detail: compactCommandBrief(command) };
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

function resultText(result: ToolResultLike | undefined): string {
	return result?.content
		?.filter((item) => item.type === "text" && typeof item.text === "string")
		.map((item) => item.text ?? "")
		.join("\n")
		.trim() ?? "";
}

function lineCount(value: string): number {
	const text = value.trim();
	return text ? text.split(/\r?\n/).length : 0;
}

function countLabel(count: number, singular: string, plural = `${singular}s`): string {
	return `${count} ${count === 1 ? singular : plural}`;
}

export function compactResultSummary(
	tool: ToolName,
	args: Record<string, unknown> | undefined,
	result: ToolResultLike | undefined,
	locale: ResolvedLocale = "en",
): string {
	const zh = locale === "zh";
	if (result?.isError) {
		const detail = resultText(result);
		return detail ? `${zh ? "错误：" : "Error: "}${detail.replace(/\s+/g, " ")}` : zh ? "错误" : "Error";
	}

	const output = resultText(result);
	const details = result?.details as { truncation?: { truncated?: boolean } } | undefined;
	const truncated = details?.truncation?.truncated === true;

	switch (tool) {
		case "bash":
			return zh
				? output
					? `${lineCount(output)} 行输出${truncated ? " · 已截断" : ""}`
					: "已完成 · 无输出"
				: output
					? `${countLabel(lineCount(output), "line")} of output${truncated ? " · truncated" : ""}`
					: "completed · no output";
		case "read":
			return zh
				? output
					? `已读取 ${lineCount(output)} 行${truncated ? " · 已截断" : ""}`
					: "读取 · 无文本输出"
				: output
					? `${countLabel(lineCount(output), "line")} read${truncated ? " · truncated" : ""}`
					: "read · no text output";
		case "write": {
			const content = typeof args?.content === "string" ? args.content : output;
			return zh
				? content
					? `已写入 ${lineCount(content)} 行 · ${content.length} 字符`
					: "已写入 · 空文件"
				: content
					? `${countLabel(lineCount(content), "line")} written · ${content.length} chars`
					: "written · empty file";
		}
		case "edit": {
			const edits = Array.isArray(args?.edits) ? args.edits.length : 0;
			return zh
				? edits
					? `${edits} 个 block 已替换`
					: "编辑已完成"
				: edits ? `${countLabel(edits, "block")} replaced` : "edit completed";
		}
		case "find":
			return zh ? `找到 ${lineCount(output)} 个匹配项` : `${countLabel(lineCount(output), "match")} found`;
		case "grep":
			return zh
				? `找到 ${lineCount(output)} 个匹配项${truncated ? " · 已截断" : ""}`
				: `${countLabel(lineCount(output), "match")} found${truncated ? " · truncated" : ""}`;
		case "ls":
			return zh ? `已列出 ${lineCount(output)} 个条目` : `${countLabel(lineCount(output), "entry")} listed`;
	}
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

export function toolBrief(tool: ToolName, args: Record<string, unknown>, locale: ResolvedLocale = "en"): string {
	const parts = compactCallParts(tool, args, locale);
	return `${tool} ${parts.purpose} ${parts.detail}`.trim();
}
