export const toolNames = ["bash", "read", "write", "edit", "find", "grep", "ls"] as const;

/** Tool-argument the model must supply so the terse row has something to show. */
export const BRIEF_PARAMETER = "brief";

export type ToolName = (typeof toolNames)[number];
export type Locale = "en" | "zh" | "auto";
export type ResolvedLocale = "en" | "zh";
export type ConfigScope = "global" | "project";

/**
 * How a tool row is drawn. `terse` is one gray line per tool call; `native` is
 * Pi's own rendering, untouched.
 */
export type Presentation = "native" | "terse";

/** Status of a single tool call, used by the terse row. */
export type ToolPhase = "pending" | "done" | "error";

/**
 * Wording a tool owner can declare for its own rows, so pi-briefly never has to
 * learn a tool's name to describe it well. See the row decorator hub in
 * `row-decorator.ts`.
 */
export interface CallWording {
	en: string;
	zh: string;
}

export interface BrieflyConfig {
	version: 2;
	terse: boolean;
	locale: Locale;
}
