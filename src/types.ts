export const toolNames = ["bash", "read", "write", "edit", "find", "grep", "ls"] as const;

export type ToolName = (typeof toolNames)[number];
export type ToolSlot = "call" | "result";
export type PresetMode = "visible" | "compact" | "collapse" | "hidden";
export type ToolStyle = "full" | "partial" | "highlight" | "compact" | "brief" | "hidden";
export type ConfigScope = "global" | "project";

export interface SlotConfig {
	style: ToolStyle;
	maxLines?: number;
	maxChars?: number;
	headLines?: number;
	tailLines?: number;
	thresholdLines?: number;
	showCommand?: boolean;
	showContent?: boolean;
	showExpandHint?: boolean;
}

export type Locale = "en" | "zh" | "auto";
export type ResolvedLocale = "en" | "zh";

export interface BrieflyConfig {
	version: 1;
	mode: PresetMode;
	locale: Locale;
}

export interface LifecycleView {
	isActive: boolean;
	isSettled: boolean;
}

export interface ResolvedSlotConfig extends SlotConfig {
	tool: ToolName;
	slot: ToolSlot;
}
