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
	// Edit diffs and new-file write previews are richer than a one-line
	// summary. Keep their native renderers in compact mode, then apply a
	// visual limiter instead of replacing the content.
	const style = config.mode === "compact" && (tool === "edit" || tool === "write")
		? "compact"
		: presetStyle(config.mode, lifecycle);
	return {
		tool,
		slot,
		style,
	};
}

export function isContentStyle(style: ToolStyle): boolean {
	return style === "full" || style === "partial" || style === "highlight" || style === "compact";
}

export function showsTurnDuration(mode: BrieflyConfig["mode"]): boolean {
	return mode === "visible" || mode === "compact";
}
