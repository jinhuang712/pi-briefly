import type {
	BrieflyConfig,
	LifecycleView,
	ResolvedSlotConfig,
	ToolName,
	ToolSlot,
	ToolStyle,
} from "./types.ts";
export function presetStyle(mode: BrieflyConfig["mode"], lifecycle: LifecycleView): ToolStyle {
	switch (mode) {
		case "visible":
			return "full";
		case "compact":
			return "brief";
		case "collapse":
			return lifecycle.isSettled ? "hidden" : "full";
		case "hidden":
			return "hidden";
	}
}

export function resolveSlot(
	config: BrieflyConfig,
	tool: ToolName,
	slot: ToolSlot,
	lifecycle: LifecycleView,
): ResolvedSlotConfig {
	return {
		tool,
		slot,
		style: presetStyle(config.mode, lifecycle),
	};
}

export function isContentStyle(style: ToolStyle): boolean {
	return style === "full" || style === "partial" || style === "highlight" || style === "compact";
}
