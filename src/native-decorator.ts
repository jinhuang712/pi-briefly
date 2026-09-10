import type { Theme, ToolRenderResultOptions } from "@earendil-works/pi-coding-agent";
import { Box, type Component, Text, truncateToWidth } from "@earendil-works/pi-tui";
import { briefFromArgs, errorExcerpt } from "./brief.ts";
import type { Presentation, ResolvedLocale, ToolName, ToolPhase } from "./types.ts";

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
}

class EmptyComponent implements Component {
	render(): string[] {
		return [];
	}

	invalidate(): void {}
}

/**
 * The whole point of pi-briefly: one gray line per tool call, carrying the
 * short description the model supplied for it.
 */
class TerseLine implements Component {
	private brief = "";
	private readonly theme: Theme;
	private readonly tool: ToolName;
	private readonly state: RowState;

	constructor(theme: Theme, tool: ToolName, state: RowState) {
		this.theme = theme;
		this.tool = tool;
		this.state = state;
	}

	setBrief(brief: string): void {
		if (this.brief === brief) return;
		this.brief = brief;
	}

	render(width: number): string[] {
		const theme = this.theme;
		const mark = this.state.phase === "done"
			? theme.fg("success", "✓")
			: this.state.phase === "error"
				? theme.fg("error", "✗")
				: theme.fg("dim", "·");
		const line = `${mark} ${theme.fg("muted", this.tool)} ${theme.fg("dim", "·")} ${theme.fg("dim", this.brief)}`;
		const lines = [truncateToWidth(line, width, "…")];
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
	tool: ToolName,
	nativeRenderer: NativeCallRenderer | undefined,
	args: unknown,
	theme: Theme,
	context: RenderContext,
	presentation: Presentation,
	locale: ResolvedLocale,
): Component {
	const state = stateOf(context);
	if (presentation === "terse") {
		const row = rowOf(context, theme, false);
		const line = state.line ?? new TerseLine(theme, tool, state);
		state.line = line;
		line.setBrief(briefFromArgs(tool, (args ?? {}) as Record<string, unknown>, locale));
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
	tool: ToolName,
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
		const changed = state.phase !== phase;
		state.phase = phase;
		state.errorText = errorText;
		state.row?.setResult(undefined);
		state.row?.setStatus(false, context.isError);
		if (changed) context.invalidate?.();
		return state.emptyResult ??= new EmptyComponent();
	}

	const row = rowOf(context, theme, tool !== "edit");
	const inner = nativeRenderer?.(result, options, theme, { ...context, lastComponent: state.nativeResult });
	state.nativeResult = inner;
	row.setResult(inner);
	row.setStatus(context.isPartial, context.isError);
	return state.emptyResult ??= new EmptyComponent();
}
