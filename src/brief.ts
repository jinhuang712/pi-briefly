import type { ToolName } from "./types.ts";

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

export function compactCallParts(tool: ToolName, args: Record<string, unknown>): CompactCallParts {
	switch (tool) {
		case "bash": {
			const command = typeof args.command === "string" ? normalizedCommand(args.command) : "...";
			return { purpose: summarizeCommand(command), detail: compactCommandBrief(command) };
		}
		case "read":
			return { purpose: "reading", detail: shorten(typeof args.path === "string" ? args.path : "...", 100) };
		case "write":
			return { purpose: "writing", detail: shorten(typeof args.path === "string" ? args.path : "...", 100) };
		case "edit":
			return { purpose: "editing", detail: shorten(typeof args.path === "string" ? args.path : "...", 100) };
		case "find":
			return { purpose: "finding files", detail: shorten(typeof args.pattern === "string" ? args.pattern : "files", 100) };
		case "grep":
			return { purpose: "searching text", detail: shorten(typeof args.pattern === "string" ? args.pattern : "text", 100) };
		case "ls":
			return { purpose: "listing", detail: shorten(typeof args.path === "string" ? args.path : ".", 100) };
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
): string {
	if (result?.isError) {
		const detail = resultText(result);
		return detail ? `Error: ${detail.replace(/\s+/g, " ")}` : "Error";
	}

	const output = resultText(result);
	const details = result?.details as { truncation?: { truncated?: boolean } } | undefined;
	const truncated = details?.truncation?.truncated === true;

	switch (tool) {
		case "bash":
			return output
				? `${countLabel(lineCount(output), "line")} of output${truncated ? " · truncated" : ""}`
				: "completed · no output";
		case "read":
			return output
				? `${countLabel(lineCount(output), "line")} read${truncated ? " · truncated" : ""}`
				: "read · no text output";
		case "write": {
			const content = typeof args?.content === "string" ? args.content : output;
			return content
				? `${countLabel(lineCount(content), "line")} written · ${content.length} chars`
				: "written · empty file";
		}
		case "edit": {
			const edits = Array.isArray(args?.edits) ? args.edits.length : 0;
			return edits ? `${countLabel(edits, "block")} replaced` : "edit completed";
		}
		case "find":
			return `${countLabel(lineCount(output), "match")} found`;
		case "grep":
			return `${countLabel(lineCount(output), "match")} found${truncated ? " · truncated" : ""}`;
		case "ls":
			return `${countLabel(lineCount(output), "entry")} listed`;
	}
}

export function summarizeCommand(command: string): string {
	const normalized = normalizedCommand(command);
	const lower = normalized.toLowerCase();
	const label = commandLabel(normalized);
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

export function toolBrief(tool: ToolName, args: Record<string, unknown>): string {
	const parts = compactCallParts(tool, args);
	return `${tool} ${parts.purpose} ${parts.detail}`.trim();
}
