import { BRIEF_MAX_CHARS } from "./brief.ts";
import { BRIEF_PARAMETER, type ResolvedLocale, type ToolName } from "./types.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function briefDescription(locale: ResolvedLocale): string {
	return locale === "zh"
		? `一句话（不超过 ${BRIEF_MAX_CHARS} 字、必须单行）说明你为什么调用这个工具，用用户的语言书写。它会显示在界面的工具名旁边。`
		: `One line (max ${BRIEF_MAX_CHARS} chars) explaining why you are calling this tool, written in the user's language. Shown next to the tool name in the UI.`;
}

/**
 * Add the required `brief` parameter to a tool's JSON schema. Built-in
 * definitions are plain JSON Schema objects, so this stays provider-agnostic
 * and does not touch execution.
 */
export function withBriefParameter(parameters: unknown, locale: ResolvedLocale = "en"): unknown {
	const schema = isRecord(parameters) ? parameters : {};
	const properties = isRecord(schema.properties) ? schema.properties : {};
	const required = Array.isArray(schema.required)
		? schema.required.filter((name): name is string => typeof name === "string")
		: [];
	return {
		...schema,
		properties: {
			...properties,
			[BRIEF_PARAMETER]: { type: "string", description: briefDescription(locale) },
		},
		required: required.includes(BRIEF_PARAMETER) ? required : [...required, BRIEF_PARAMETER],
	};
}

/**
 * Runs before schema validation. The model is asked for a brief, but a missing
 * one must never fail the tool call: the row derives its own description when
 * the value is absent or blank, so an empty string is enough to satisfy the
 * required field without inventing text the model never wrote. This also keeps
 * older sessions replayable after the parameter was introduced.
 */
export function prepareBriefArguments(
	tool: ToolName,
	args: unknown,
	_locale: ResolvedLocale = "en",
): Record<string, unknown> {
	const input = isRecord(args) ? args : {};
	const existing = typeof input[BRIEF_PARAMETER] === "string" ? (input[BRIEF_PARAMETER] as string).trim() : "";
	if (existing) return input;
	return { ...input, [BRIEF_PARAMETER]: "" };
}

/**
 * Built-in tool implementations take their own parameters, so the display-only
 * `brief` is removed before delegating execution.
 */
export function stripBriefParameter(params: unknown): Record<string, unknown> {
	if (!isRecord(params)) return {};
	if (!(BRIEF_PARAMETER in params)) return params;
	const rest: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(params)) {
		if (key !== BRIEF_PARAMETER) rest[key] = value;
	}
	return rest;
}

/**
 * Appended to the system prompt while terse mode is on, so the requirement is
 * visible even to models that skim tool schemas.
 */
export function briefInstruction(locale: ResolvedLocale): string {
	if (locale === "zh") {
		return [
			`【pi-briefly 精简模式】你发起的每一次工具调用都必须带上 "${BRIEF_PARAMETER}" 参数：`,
			`一行文字（不超过 ${BRIEF_MAX_CHARS} 字、不要换行、结尾不加句号）说明你为什么调用这个工具，`,
			"用用户当前使用的语言书写。这条说明会显示在界面的工具名旁边，替代原始工具输出。",
		].join("");
	}
	return [
		`[pi-briefly terse mode] Every tool call you make must include the "${BRIEF_PARAMETER}" argument: `,
		`one line (max ${BRIEF_MAX_CHARS} chars, no line breaks, no trailing period) stating why you are calling that tool, `,
		"written in the user's language. It is shown in the UI next to the tool name instead of the raw tool output.",
	].join("");
}
