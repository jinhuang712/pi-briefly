import type { Theme, ToolRenderResultOptions } from "@earendil-works/pi-coding-agent";
import { Box, type Component, stripTerminalSequences, Text } from "@earendil-works/pi-tui";
import { compactCallParts, compactResultSummary } from "./brief.ts";
import type { ResolvedLocale, ResolvedSlotConfig, ToolStyle } from "./types.ts";

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

type DecoratedState = {
	nativeCall?: Component;
	nativeResult?: Component;
	callDecorator?: DecoratedComponent;
	resultDecorator?: DecoratedComponent;
	row?: ToolRowComponent;
	emptyResult?: EmptyComponent;
};

function isOmissionLine(line: string): boolean {
	return line.includes("more lines") || line.includes("to expand");
}

function visibleLength(value: string): number {
	return value.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "").length;
}

function isChangedDiffLine(line: string): boolean {
	return /^\s*[+-]\s*\d+\s/.test(stripTerminalSequences(line));
}

function flattenNativeShell(line: string): string {
	const flattened = line
		.replace(/\x1b\[(?:48(?:;[0-9;]*)?|49)m/g, "")
		.trimEnd();
	return flattened.startsWith(" ") ? flattened.slice(1) : flattened;
}


class EmptyComponent implements Component {
	render(_width: number): string[] {
		return [];
	}

	invalidate(): void {}
}

class ToolRowComponent implements Component {
	private readonly box: Box;
	private readonly theme: Theme;
	private withBackground: boolean;
	private call?: Component;
	private result?: Component;
	private isPartial = true;
	private isError = false;
	private flat = false;

	constructor(theme: Theme, withBackground: boolean) {
		this.theme = theme;
		this.withBackground = withBackground;
		this.box = new Box(1, 1, (text: string) => theme.bg("toolPendingBg", text));
	}

	setWithBackground(withBackground: boolean): void {
		if (this.withBackground === withBackground) return;
		this.withBackground = withBackground;
		this.box.invalidate();
	}

	setCall(component: Component, isPartial: boolean, isError: boolean, flat: boolean): void {
		this.call = component;
		this.isPartial = isPartial;
		this.isError = isError;
		this.flat = flat;
	}

	setResult(component: Component): void {
		this.result = component;
	}

	render(width: number): string[] {
		if (!this.withBackground || this.flat) {
			return [...(this.call?.render(width) ?? []), ...(this.result?.render(width) ?? [])];
		}
		this.box.setBgFn((text: string) => {
			if (this.isPartial) return this.theme.bg("toolPendingBg", text);
			if (this.isError) return this.theme.bg("toolErrorBg", text);
			return this.theme.bg("toolSuccessBg", text);
		});
		this.box.clear();
		if (this.call) this.box.addChild(this.call);
		if (this.result) this.box.addChild(this.result);
		return this.box.render(width);
	}

	invalidate(): void {
		this.box.invalidate();
		this.call?.invalidate?.();
		this.result?.invalidate?.();
	}

}

class DecoratedComponent implements Component {
	private readonly theme: Theme;
	private inner?: Component;
	private style: ToolStyle = "full";
	private policy: ResolvedSlotConfig = { style: "full", tool: "bash", slot: "call" };
	private brief = "";
	private hint = "";
	private args?: unknown;
	private summary?: string;
	private locale: ResolvedLocale = "en";

	constructor(theme: Theme) {
		this.theme = theme;
	}

	set(
		inner: Component | undefined,
		style: ToolStyle,
		policy: ResolvedSlotConfig,
		brief: string,
		hint: string,
		args?: unknown,
		summary?: string,
		locale: ResolvedLocale = "en",
	): void {
		this.inner = inner;
		this.style = style;
		this.policy = policy;
		this.brief = brief;
		this.hint = hint;
		this.args = args;
		this.summary = summary;
		this.locale = locale;
	}

	render(width: number): string[] {
		if (this.style === "hidden") return [];
		if (this.style === "brief") return this.brief ? new Text(this.brief, 0, 0).render(width) : [];
		if (!this.inner) return [];
		const lines = this.inner.render(width);
		if (this.style === "full") return lines;
		if (this.style === "compact" && this.policy.tool === "edit") return this.renderCompactEdit(width, lines);
		let limited: string[];
		if (this.style === "compact" && this.policy.tool === "write" && this.policy.slot === "call") {
			limited = this.limitHead(lines);
		} else {
			limited = this.limit(lines);
		}
		if (this.policy.slot === "result" && this.summary) {
			const summary = new Text(
				`\n${this.theme.fg("muted", "│")} ${this.theme.fg("toolOutput", this.summary)}`,
				0,
				0,
			).render(width);
			return [...limited, ...summary];
		}
		return limited;
	}

	invalidate(): void {
		this.inner?.invalidate?.();
	}

	private renderCompactEdit(width: number, lines: string[]): string[] {
		const compactLines = lines.map(flattenNativeShell);
		const changedIndexes = compactLines
			.map((line, index) => (isChangedDiffLine(line) ? index : -1))
			.filter((index) => index >= 0);

		if (this.policy.slot === "call") {
			const header = new Text(compactCallText(this.theme, "edit", this.args, this.brief, this.locale), 0, 0).render(width);
			if (changedIndexes.length === 0) {
				const firstContentIndex = compactLines.findIndex((line) => stripTerminalSequences(line).trim().length > 0);
				return [...header, ...(firstContentIndex < 0 ? [] : compactLines.slice(firstContentIndex + 1).filter((line) => line.trim()))];
			}
			return [...header, ...changedIndexes.map((index) => compactLines[index])];
		}

		return changedIndexes.length > 0 ? changedIndexes.map((index) => compactLines[index]) : compactLines;
	}

	private limitHead(lines: string[]): string[] {
		const omissionIndex = lines.findIndex(isOmissionLine);
		const sourceLines = omissionIndex >= 0 ? lines.slice(0, omissionIndex) : lines;
		const maxLines = Math.max(1, this.policy.maxLines ?? 4);
		if (sourceLines.length <= maxLines && omissionIndex < 0) return lines;
		const kept = sourceLines.slice(0, maxLines);
		const omitted = Math.max(1, sourceLines.length - kept.length);
		const hint = this.policy.showExpandHint === false
			? this.theme.fg("muted", "... (content hidden)")
			: this.theme.fg("muted", `... (${omitted} lines hidden, ${this.hint})`);
		return [...kept, hint];
	}

	private limit(lines: string[]): string[] {
		const omissionIndex = lines.findIndex(isOmissionLine);
		const sourceLines = omissionIndex >= 0 ? lines.slice(0, omissionIndex) : lines;
		const defaultMax = this.style === "compact"
			? 4
			: this.style === "highlight" && this.policy.thresholdLines
				? this.policy.thresholdLines
				: 10;
		const maxLines = Math.max(1, this.policy.maxLines ?? defaultMax);
		const charLimitedLines = this.policy.maxChars === undefined
			? maxLines
			: Math.max(
					1,
					sourceLines.reduce((count, line) => {
						if (count.total + visibleLength(line) > this.policy.maxChars! && count.lines > 0) return count;
						return { total: count.total + visibleLength(line), lines: count.lines + 1 };
					}, { total: 0, lines: 0 }).lines,
			  );
		const effectiveMaxLines = Math.min(maxLines, charLimitedLines);
		const threshold = this.policy.thresholdLines ?? effectiveMaxLines;
		if (sourceLines.length <= effectiveMaxLines && sourceLines.length <= threshold) return lines;

		const headLines = Math.min(
			effectiveMaxLines,
			Math.max(1, this.policy.headLines ?? (this.style === "highlight" ? maxLines : Math.ceil(maxLines * 0.7))),
		);
		const tailLines = Math.min(
			Math.max(0, effectiveMaxLines - headLines),
			this.policy.tailLines ?? Math.floor(maxLines * 0.3),
		);
		const kept = [...sourceLines.slice(0, headLines), ...sourceLines.slice(sourceLines.length - tailLines)];
		const omitted = Math.max(1, sourceLines.length - kept.length);
		const hint = this.policy.showExpandHint === false
			? this.theme.fg("muted", "... (content hidden)")
			: this.theme.fg("muted", `... (${omitted} lines hidden, ${this.hint})`);
		return [...kept.slice(0, headLines), hint, ...(tailLines > 0 ? kept.slice(headLines) : [])];
	}
}

function stateOf(context: RenderContext): DecoratedState {
	return context.state as DecoratedState;
}

function compactCallText(theme: Theme, tool: ResolvedSlotConfig["tool"], args: unknown, fallback: string, locale: ResolvedLocale = "en"): string {
	const parts = compactCallParts(tool, (args ?? {}) as Record<string, unknown>, locale);
	const detail = parts.detail
		? `${theme.fg("muted", " · ")}${theme.fg("dim", parts.detail)}`
		: "";
	const styledToolName = theme.fg("toolTitle", theme.bold(theme.italic(tool)));
	return `${styledToolName} ${theme.fg("toolTitle", parts.purpose)}${detail}` || fallback;
}

function nativeContext(context: RenderContext, lastComponent: Component | undefined): RenderContext {
	return { ...context, lastComponent };
}

function rowOf(
	context: RenderContext,
	theme: Theme,
	tool: ResolvedSlotConfig["tool"],
	withBackground = tool !== "edit",
): ToolRowComponent {
	const state = stateOf(context);
	if (!state.row) state.row = new ToolRowComponent(theme, withBackground);
	else state.row.setWithBackground(withBackground);
	return state.row;
}

export function renderCallWithStyle(
	nativeRenderer: NativeCallRenderer | undefined,
	args: unknown,
	theme: Theme,
	context: RenderContext,
	policy: ResolvedSlotConfig,
	brief: string,
	_hint: string,
	summary?: string,
	locale: ResolvedLocale = "en",
): Component {
	const state = stateOf(context);
	const row = rowOf(context, theme, policy.tool, policy.style === "compact" || policy.tool !== "edit");
	if (summary) {
		const summaryText = `${theme.fg("success", "✓")} ${theme.fg("muted", summary)} ${theme.fg("dim", `(${_hint})`)}`;
		row.setCall(new Text(summaryText, 0, 0), context.isPartial, context.isError, true);
		return row;
	}
	const inner = policy.style === "hidden" || policy.style === "brief"
		? undefined
		: nativeRenderer?.(args, theme, nativeContext(context, state.nativeCall));
	state.nativeCall = inner;
	const callComponent = policy.style === "hidden"
		? new EmptyComponent()
		: policy.style === "brief"
			? new Text(compactCallText(theme, policy.tool, args, brief, locale), 0, 0)
			: policy.style === "full"
				? inner ?? new Text(brief, 0, 0)
				: (() => {
					const decorator = state.callDecorator ?? new DecoratedComponent(theme);
					decorator.set(inner, policy.style, policy, brief, _hint, args, undefined, locale);
					state.callDecorator = decorator;
					return decorator;
				})();
	row.setCall(callComponent, context.isPartial, context.isError, policy.style === "hidden");
	return row;
}

export function renderResultWithStyle(
	nativeRenderer: NativeResultRenderer | undefined,
	result: DisplayResult,
	options: ToolRenderResultOptions,
	theme: Theme,
	context: RenderContext,
	policy: ResolvedSlotConfig,
	brief: string,
	_hint: string,
	locale: ResolvedLocale = "en",
): Component {
	const state = stateOf(context);
	const row = rowOf(context, theme, policy.tool, policy.style === "compact" || policy.tool !== "edit");
	const inner = policy.style === "hidden" || policy.style === "brief"
		? undefined
		: nativeRenderer?.(result, options, theme, nativeContext(context, state.nativeResult));
	state.nativeResult = inner;
	const resultComponent = policy.style === "hidden"
		? new EmptyComponent()
		: policy.style === "brief"
			? new Text(
					`\n${theme.fg("muted", "│")} ${theme.fg(context.isError ? "error" : "toolOutput", compactResultSummary(policy.tool, context.args, { ...result, isError: context.isError }))}`,
					0,
					0,
				)
			: policy.style === "full"
				? inner ?? new Text(brief, 0, 0)
				: (() => {
					const decorator = state.resultDecorator ?? new DecoratedComponent(theme);
					const summary = policy.tool === "edit" || policy.tool === "write"
						? compactResultSummary(policy.tool, context.args, { ...result, isError: context.isError })
						: undefined;
					decorator.set(inner, policy.style, policy, brief, _hint, context.args, context.isError ? undefined : summary, locale);
					state.resultDecorator = decorator;
					return decorator;
				})();
	row.setResult(resultComponent);
	state.emptyResult ??= new EmptyComponent();
	return state.emptyResult;
}
