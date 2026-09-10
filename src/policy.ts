import type { BrieflyConfig, Presentation } from "./types.ts";

/**
 * pi-briefly has exactly one switch: terse on or off.
 *
 * - on: every built-in tool row becomes a single gray line
 * - off: Pi's native presentation, untouched
 *
 * Expansion (Ctrl+O) is always an escape hatch back to the native row, so the
 * terse switch never hides information irreversibly.
 */
export function presentationFor(config: BrieflyConfig, expanded = false): Presentation {
	if (expanded) return "native";
	return config.terse ? "terse" : "native";
}
