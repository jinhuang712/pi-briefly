import type { Theme, ToolRenderResultOptions } from "@earendil-works/pi-coding-agent";
import { Box, type Component, Text, truncateToWidth } from "@earendil-works/pi-tui";
import { describeCall, errorExcerpt, type CallDescription } from "./brief.ts";
import { formatCallDuration } from "./summary.ts";
import type { CallWording, Presentation, ResolvedLocale, ToolName, ToolPhase } from "./types.ts";

export interface RenderContext {
	args: Record<string, unknown>;
	toolCallId: string;
	invalidate: () => void;
	lastComponent?: Component;
	state: Record<string, unknown>;
	cwd: string;
	executionStarted: boolean;
	argsComplete: boolean;
	isPartial: boolean;
	expanded: boolean;
	showImages: boolean;
	isError: boolean;
}

export interface DisplayResult {
	content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
	details?: unknown;
}

export type NativeCallRenderer = (args: unknown, theme: Theme, context: RenderContext) => Component;
export type NativeResultRenderer = (
	result: DisplayResult,
	options: ToolRenderResultOptions,
	theme: Theme,
	context: RenderContext,
) => Component;

/** Row-local state shared by the call and result renderers of one tool call. */
interface RowState {
	row?: ToolRowComponent;
	line?: TerseLine;
	nativeCall?: Component;
	nativeResult?: Component;
	emptyResult?: Component;
	phase: ToolPhase;
	errorText?: string;
	startedAt?: number;
	endedAt?: number;
	invalidate?: () => void;
}

/**
 * Rows whose call is still running. Each one repaints itself once per second so
 * the elapsed value keeps moving even when a tool prints nothing. The timer
 * exists only while something is actually running, and it never touches Pi's
 * working indicator - turn timing belongs to `pi-elapsed`.
 */
const pendingTimingRows = new Set<RowState>();
let tickTimer: ReturnType<typeof setInterval> | undefined;

function stopTicking(): void {
	if (tickTimer === undefined) return;
	clearInterval(tickTimer);
	tickTimer = undefined;
}

function ensureTicking(): void {
	if (tickTimer !== undefined) return;
	tickTimer = setInterval(() => {
		for (const state of pendingTimingRows) {
			if (state.startedAt === undefined || state.endedAt !== undefined) pendingTimingRows.delete(state);
			else state.invalidate?.();
		}
		if (pendingTimingRows.size === 0) stopTicking();
	}, 1000);
	(tickTimer as { unref?: () => void }).unref?.();
}

class EmptyComponent implements Component {
	render(): string[] {
		return [];
	}

	invalidate(): void {}
}

/**
 * The whole point of pi-briefly: one line per tool call, carrying the status,
 * the tool, the per-call timing and the description the model supplied.
 *
 * Typography carries the hierarchy, so no separator glyphs are needed: the tool
 * name is bold, the timing and a raw heuristic target are italic, and the
 * description stays plain gray.
 */
class TerseLine implements Component {
	private brief = "";
	private detail?: string;
	private readonly theme: Theme;
	private readonly tool: string;
	private readonly state: RowState;

	constructor(theme: Theme, tool: string, state: RowState) {
		this.theme = theme;
		this.tool = tool;
		this.state = state;
	}

	setDescription(description: CallDescription): void {
		this.brief = description.brief;
		this.detail = description.detail;
	}

	/**
	 * Just the number: the status mark already says whether the call is still
	 * running, so a label would be redundant. A replayed row has no clock and
	 * therefore shows no timing at all, rather than a fake `0.0s`.
	 */
	private timing(): string | undefined {
		const { startedAt, endedAt } = this.state;
		if (startedAt === undefined) return undefined;
		if (this.state.phase === "pending") return `(${formatCallDuration(Date.now() - startedAt)})`;
		return endedAt === undefined ? undefined : `(${formatCallDuration(endedAt - startedAt)})`;
	}

	render(width: number): string[] {
		const theme = this.theme;
		const mark = this.state.phase === "done"
			? theme.fg("success", "✓")
			: this.state.phase === "error"
				? theme.fg("error", "✗")
				: theme.fg("dim", "·");

		const segments = [mark, theme.bold(theme.fg("muted", this.tool))];
		const timing = this.timing();
		if (timing) segments.push(theme.italic(theme.fg("dim", timing)));
		segments.push(theme.fg("dim", this.brief));
		if (this.detail) segments.push(theme.fg("dim", "›"), theme.italic(theme.fg("muted", this.detail)));

		const lines = [truncateToWidth(segments.join(" "), width, "…")];
		if (this.state.phase === "error" && this.state.errorText) {
			lines.push(truncateToWidth(`${theme.fg("muted", "│")} ${theme.fg("error", this.state.errorText)}`, width, "…"));
		}
		return lines;
	}

	invalidate(): void {}
}

/**
 * Hosts the two slots of one tool call. In native mode it reproduces Pi's
 * default box; in terse mode it is a flat, box-less single row.
 */
class ToolRowComponent implements Component {
	private readonly theme: Theme;
	private readonly box: Box;
	private boxed: boolean;
	private call?: Component;
	private result?: Component;
	private boxedCall?: Component;
	private boxedResult?: Component;
	private isPartial = true;
	private isError = false;

	constructor(theme: Theme, boxed: boolean) {
		this.theme = theme;
		this.boxed = boxed;
		this.box = new Box(1, 1, (text: string) => theme.bg("toolPendingBg", text));
	}

	setBoxed(boxed: boolean): void {
		if (this.boxed === boxed) return;
		this.boxed = boxed;
		this.box.invalidate();
	}

	setCall(component: Component): void {
		this.call = component;
	}

	setResult(component: Component | undefined): void {
		this.result = component;
	}

	setStatus(isPartial: boolean, isError: boolean): void {
		this.isPartial = isPartial;
		this.isError = isError;
	}

	private syncBoxChildren(): void {
		if (this.boxedCall === this.call && this.boxedResult === this.result) return;
		this.box.clear();
		if (this.call) this.box.addChild(this.call);
		if (this.result) this.box.addChild(this.result);
		this.boxedCall = this.call;
		this.boxedResult = this.result;
	}

	render(width: number): string[] {
		if (!this.boxed) {
			return [...(this.call?.render(width) ?? []), ...(this.result?.render(width) ?? [])];
		}
		this.box.setBgFn((text: string) => {
			if (this.isPartial) return this.theme.bg("toolPendingBg", text);
			if (this.isError) return this.theme.bg("toolErrorBg", text);
			return this.theme.bg("toolSuccessBg", text);
		});
		this.syncBoxChildren();
		return this.box.render(width);
	}

	invalidate(): void {
		this.box.invalidate();
		this.call?.invalidate?.();
		this.result?.invalidate?.();
	}
}

function stateOf(context: RenderContext): RowState {
	const state = context.state as Partial<RowState> & Record<string, unknown>;
	state.phase ??= "pending";
	return state as RowState;
}

function rowOf(context: RenderContext, theme: Theme, boxed: boolean): ToolRowComponent {
	const state = stateOf(context);
	if (!state.row) {
		state.row = new ToolRowComponent(theme, boxed);
	} else {
		state.row.setBoxed(boxed);
	}
	return state.row;
}

export function renderToolCall(
	tool: ToolName | (string & {}),
	nativeRenderer: NativeCallRenderer | undefined,
	args: unknown,
	theme: Theme,
	context: RenderContext,
	presentation: Presentation,
	locale: ResolvedLocale,
	wording?: CallWording,
): Component {
	const state = stateOf(context);
	if (presentation === "terse") {
		const row = rowOf(context, theme, false);
		const line = state.line ?? new TerseLine(theme, tool, state);
		state.line = line;
		line.setDescription(describeCall(tool, (args ?? {}) as Record<string, unknown>, locale, wording));
		// Mirror Pi's native rows: the clock starts when execution really starts,
		// which also keeps replayed sessions from reporting a fake duration.
		if (context.executionStarted && state.startedAt === undefined) state.startedAt = Date.now();
		state.invalidate = context.invalidate;
		if (state.startedAt !== undefined && state.endedAt === undefined) {
			pendingTimingRows.add(state);
			ensureTicking();
		}
		row.setCall(line);
		row.setStatus(context.isPartial, context.isError);
		return row;
	}

	const row = rowOf(context, theme, tool !== "edit");
	const inner = nativeRenderer?.(args, theme, { ...context, lastComponent: state.nativeCall });
	state.nativeCall = inner;
	row.setCall(inner ?? new Text(tool, 0, 0));
	row.setStatus(context.isPartial, context.isError);
	return row;
}

export function renderToolResult(
	tool: ToolName | (string & {}),
	nativeRenderer: NativeResultRenderer | undefined,
	result: DisplayResult,
	options: ToolRenderResultOptions,
	theme: Theme,
	context: RenderContext,
	presentation: Presentation,
): Component {
	const state = stateOf(context);
	if (presentation === "terse") {
		// The call row owns the only visible line; the result slot stays empty
		// and merely flips the status mark. Results stream in while the tool is
		// still running, so only a completed result may flip the mark;
		// `context.isPartial` describes the call arguments, not the result.
		const isPartial = options?.isPartial === true;
		const phase: ToolPhase = isPartial ? "pending" : context.isError ? "error" : "done";
		const errorText = phase === "error" ? errorExcerpt(result) : undefined;
		// The clock stops with the finished result, matching Pi's native rows.
		const finished = !isPartial && state.startedAt !== undefined && state.endedAt === undefined;
		const changed = state.phase !== phase || finished;
		state.phase = phase;
		state.errorText = errorText;
		state.invalidate = context.invalidate;
		if (finished) {
			state.endedAt = Date.now();
			pendingTimingRows.delete(state);
			if (pendingTimingRows.size === 0) stopTicking();
		}
		state.row?.setResult(undefined);
		state.row?.setStatus(false, context.isError);
		if (changed) context.invalidate?.();
		return state.emptyResult ??= new EmptyComponent();
	}

	const row = rowOf(context, theme, tool !== "edit");
	const inner = nativeRenderer?.(result, options, theme, { ...context, lastComponent: state.nativeResult }) ?? textResult(theme, result);
	state.nativeResult = inner;
	row.setResult(inner);
	row.setStatus(context.isPartial, context.isError);
	return state.emptyResult ??= new EmptyComponent();
}

/**
 * Result text for a tool that has no native result renderer of its own.
 *
 * A decorated tool is only ever handed over by its owner, and an owner may well
 * have no result slot (pi-lite-web has none). The terse row hides the
 * result anyway, but the expanded row still has to show it, so render the text
 * instead of dropping it.
 */
function textResult(theme: Theme, result: DisplayResult): Component | undefined {
	const text = (result.content ?? [])
		.filter((item) => item.type === "text" && typeof item.text === "string")
		.map((item) => item.text ?? "")
		.join("\n")
		.trim();
	return text ? new Text(theme.fg("toolOutput", text), 0, 0) : undefined;
}
