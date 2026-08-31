import type { PresetMode } from "./types.ts";

/**
 * How assistant thinking blocks should be presented.
 *
 * - `native`: leave the thinking markdown untouched (Pi renders it in full).
 * - `brief`: replace the thinking block with a one-line brief.
 * - `collapsed`: replace settled thinking with the collapsed label.
 * - `suppressed`: render nothing at all.
 */
export type ThinkingPresentation = "native" | "brief" | "collapsed" | "hiddenStub" | "suppressed";

export interface ThinkingView {
	/** True while the thinking's message is still streaming. */
	streaming: boolean;
	/** True once the current agent run has settled. */
	settled: boolean;
	/** True while the user expanded tool output (Ctrl+O). */
	expanded: boolean;
}

/**
 * Resolve how assistant thinking blocks should be presented for a preset mode.
 *
 * - `visible` keeps native thinking in full in every state.
 * - `compact` keeps the thinking process fully visible while its message
 *   streams, then folds it into a one-line brief the moment the message
 *   completes — before the turn ends. Ctrl+O restores native text.
 * - `collapse` condenses thinking to a one-line brief during the run and to
 *   the collapsed label once settled; Ctrl+O restores native text.
 * - `hidden` leaves a one-line stub when collapsed and restores native
 *   text when expanded (Ctrl+O), so the transcript never looks like a
 *   blank gap.
 */
export function resolveThinkingPresentation(mode: PresetMode, view: ThinkingView): ThinkingPresentation {
	if (mode === "visible") return "native";
	if (view.expanded) return "native";
	if (mode === "hidden") return "hiddenStub";
	if (mode === "compact") return view.streaming ? "native" : "brief";
	return view.settled ? "collapsed" : "brief";
}

const BRIEF_MAX_CHARS = 80;

function meaningfulLines(markdown: string): string[] {
	return markdown
		.split("\n")
		.map((candidate) => candidate.trim())
		.filter((candidate) => candidate.length > 0);
}

function plainThinkingLine(line: string): string {
	return line
		.replace(/^#+\s*/, "")
		.replace(/^[-*+]\s+/, "")
		.replace(/[`*_~]/g, "")
		.trim();
}

/**
 * Detect provider-generated reasoning summaries that are already concise.
 * GPT-style output commonly contains several short, standalone lines split
 * by blank lines; re-prefixing those lines with `…` only adds noise.
 */
export function isAlreadyCondensedThinking(markdown: string): boolean {
	const blocks = markdown
		.split(/\n\s*\n/)
		.map((block) => block.trim())
		.filter((block) => block.length > 0);
	if (blocks.length === 0) return false;
	return blocks.every((block) => {
		const lines = meaningfulLines(block);
		return lines.length === 1 && plainThinkingLine(lines[0]).length <= BRIEF_MAX_CHARS;
	});
}

/**
 * Build a one-line brief from thinking markdown: the first meaningful line
 * with light markdown decoration stripped, truncated to one terminal line.
 * Falls back to the given label when no meaningful line exists.
 */
export function thinkingBrief(markdown: string, fallback: string): string {
	const line = meaningfulLines(markdown)[0];
	if (!line) return fallback;
	const plain = plainThinkingLine(line);
	const brief = plain.length > 0 ? plain : line;
	if (brief.length <= BRIEF_MAX_CHARS) return `… ${brief}`;
	return `… ${brief.slice(0, BRIEF_MAX_CHARS)}…`;
}
