/**
 * pi-briefly: one switch for tool presentation.
 *
 * Tool execution stays delegated to Pi's built-in implementations. With terse
 * mode on, every built-in tool row collapses to a single gray line carrying the
 * short description the model supplied for that call. With it off, Pi renders
 * everything natively.
 */

import { type ExtensionAPI, type Theme } from "@earendil-works/pi-coding-agent";
import {
	createBashToolDefinition,
	createEditToolDefinition,
	createFindToolDefinition,
	createGrepToolDefinition,
	createLsToolDefinition,
	createReadToolDefinition,
	createWriteToolDefinition,
	keyText,
} from "@earendil-works/pi-coding-agent";
import { getKeybindings, isViewportTUI, Text, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { briefInstruction, prepareBriefArguments, stripBriefParameter, withBriefParameter } from "./brief-parameter.ts";
import { loadConfig, saveConfig, setLocale, setTerse } from "./config.ts";
import {
	getTranscriptNavigationPill,
	notifyLocale,
	notifyReloaded,
	notifyToggled,
	notifyUsage,
	resolveLocale,
	type TranscriptNavigationPosition,
	workingMessage,
} from "./i18n.ts";
import { renderToolCall, renderToolResult, tickPendingTiming, type RenderContext } from "./native-decorator.ts";
import { presentationFor, showsTurnDuration } from "./policy.ts";
import { formatDuration, formatTook } from "./summary.ts";
import { type BrieflyConfig, type Locale, type ToolName, toolNames } from "./types.ts";

type BuiltInTools = ReturnType<typeof createBuiltInTools>;
type AnyTool = Record<string, any>;

const TURN_DURATION_TYPE = "pi-briefly-turn-duration";
const NAVIGATION_HINT_WIDGET_KEY = "pi-briefly-navigation-hint";
const MAC_PROMPT_NAVIGATION_KEY = "ctrl+\\";
const MAC_BOTTOM_NAVIGATION_KEY = "ctrl+]";
const OSC133_PROMPT_START = /^\x1b\]133;A(?:\x07|\x1b\\)/;
const OSC133_PROMPT_END = /^\x1b\]133;B(?:\x07|\x1b\\)/;

function findScrollViewBox(box: any, scrollView: any): any {
	if (!box) return undefined;
	if (box.scrollView === scrollView) return box;
	for (const child of box.children ?? []) {
		const match = findScrollViewBox(child, scrollView);
		if (match) return match;
	}
	return undefined;
}

function getNavigationPosition(tui: any): TranscriptNavigationPosition {
	const layout = tui?.currentLayout;
	const scrollView = layout?.primaryScrollView;
	if (!scrollView) return tui?.isFollowingOutput === true ? "bottom" : "middle";

	const box = findScrollViewBox(layout.root, scrollView);
	const scrollTop = scrollView.scrollTop;
	const contentLines = box?.scrollContentLines;
	const maxScrollTop = box ? Math.max(0, (contentLines?.length ?? 0) - (box.rect?.height ?? 0)) : undefined;
	if (scrollView.isFollowingEnd || tui?.isFollowingOutput === true || (maxScrollTop !== undefined && scrollTop >= maxScrollTop)) {
		return "bottom";
	}
	if (contentLines && Number.isInteger(scrollTop) && OSC133_PROMPT_START.test(contentLines[scrollTop] ?? "")) return "prompt";
	return "middle";
}

function isRenderableChatMessage(entry: any): boolean {
	if (entry?.type !== "message") return false;
	const message = entry.message;
	return message?.role === "user" || (message?.role === "assistant" && !message.content?.some((part: any) => part.type === "toolCall"));
}

function getMessageText(message: any): string | undefined {
	const content = Array.isArray(message?.content) ? message.content : [];
	const text = content
		.filter((part: any) => part.type === "text" && typeof part.text === "string")
		.map((part: any) => part.text.replace(/\s+/g, " ").trim())
		.filter(Boolean)
		.join(" ");
	return text || undefined;
}

interface UserPromptMarker {
	row: number;
	endRow: number;
	text: string;
}

function getUserPromptMarkers(tui: any, sessionManager: any): UserPromptMarker[] {
	const layout = tui?.currentLayout;
	const scrollView = layout?.primaryScrollView;
	if (!scrollView) return [];

	const box = findScrollViewBox(layout.root, scrollView);
	const lines = box?.scrollContentLines;
	if (!lines) return [];

	const entries = sessionManager?.buildContextEntries?.().filter(isRenderableChatMessage) ?? [];
	let entryIndex = 0;
	const markers: UserPromptMarker[] = [];
	for (let row = 0; row < lines.length; row++) {
		if (!OSC133_PROMPT_START.test(lines[row] ?? "")) continue;
		const entry = entries[entryIndex++];
		if (entry?.message?.role !== "user") continue;
		const text = getMessageText(entry.message);
		if (!text) continue;

		let endRow = lines.length;
		for (let nextRow = row; nextRow < lines.length; nextRow++) {
			if (OSC133_PROMPT_END.test(lines[nextRow] ?? "")) {
				endRow = nextRow + 1;
				break;
			}
		}
		markers.push({ row, endRow, text });
	}
	return markers;
}

function getStickyPromptText(tui: any, sessionManager: any): string | undefined {
	const scrollTop = tui?.currentLayout?.primaryScrollView?.scrollTop;
	if (!Number.isInteger(scrollTop)) return undefined;
	const markers = getUserPromptMarkers(tui, sessionManager);
	let active: UserPromptMarker | undefined;
	for (const marker of markers) {
		if (marker.row >= scrollTop) break;
		active = marker;
	}
	if (!active || active.endRow > scrollTop) return undefined;

	// If the next prompt starts exactly at the viewport top, the real prompt is
	// already visible there; don't paint the previous prompt over it.
	const next = markers.find((marker) => marker.row >= scrollTop);
	if (next?.row === scrollTop) return undefined;
	return active.text;
}

const patchedPromptNavigationTuis = new WeakSet<object>();

function installUserPromptNavigation(tui: any, sessionManager: any): void {
	if (!tui || typeof tui !== "object" || patchedPromptNavigationTuis.has(tui)) return;
	const nativeScrollToPrompt = tui.scrollToPrompt;
	if (typeof nativeScrollToPrompt !== "function") return;

	patchedPromptNavigationTuis.add(tui);
	tui.scrollToPrompt = (direction: number) => {
		if (direction >= 0) {
			nativeScrollToPrompt(direction);
			return;
		}

		const currentTop = tui?.currentLayout?.primaryScrollView?.scrollTop;
		const target = getUserPromptMarkers(tui, sessionManager)
			.map((marker) => marker.row)
			.filter((row) => row < currentTop)
			.pop();
		if (target === undefined) return;

		let previousTop = currentTop;
		for (let attempt = 0; attempt < 100 && previousTop > target; attempt++) {
			nativeScrollToPrompt(direction);
			const nextTop = tui?.currentLayout?.primaryScrollView?.scrollTop;
			if (!Number.isInteger(nextTop) || nextTop >= previousTop) break;
			previousTop = nextTop;
		}
	};
}

class StickyPromptPreview extends Text {
	private readonly tui: any;
	private readonly sessionManager: any;
	private readonly backgroundStyle: (text: string) => string;
	private readonly prefixStyle: (text: string) => string;
	private readonly textStyle: (text: string) => string;
	private requestedLayoutRefresh = false;

	constructor(
		tui: any,
		sessionManager: any,
		backgroundStyle: (text: string) => string,
		prefixStyle: (text: string) => string,
		textStyle: (text: string) => string,
	) {
		super("", 0, 0);
		this.tui = tui;
		this.sessionManager = sessionManager;
		this.backgroundStyle = backgroundStyle;
		this.prefixStyle = prefixStyle;
		this.textStyle = textStyle;
	}

	override render(width: number): string[] {
		if (!isViewportTUI(this.tui)) return [];
		// Pi exposes the viewport layout without typing it, so read it defensively.
		const tui: any = this.tui;
		if (!tui.currentLayout && !this.requestedLayoutRefresh) {
			this.requestedLayoutRefresh = true;
			queueMicrotask(() => tui.requestRender?.());
		}

		const prompt = getStickyPromptText(tui, this.sessionManager);
		if (!prompt) return [];

		const prefix = truncateToWidth("prompt:", Math.max(1, width - 2), "");
		const prefixLabel = this.prefixStyle(width >= 3 ? ` ${prefix} ` : prefix);
		const remainingWidth = Math.max(0, width - visibleWidth(prefixLabel) - 1);
		const promptText = remainingWidth > 0 ? ` ${truncateToWidth(prompt, remainingWidth, "…")}` : "";
		const content = `${prefixLabel}${this.textStyle(promptText)}`;
		const line = `${content}${" ".repeat(Math.max(0, width - visibleWidth(content)))}`;
		this.setText(this.backgroundStyle(line));
		return super.render(width);
	}
}

class DynamicNavigationHint extends Text {
	private readonly tui: any;
	private readonly locale: "en" | "zh";
	private readonly promptKey: string;
	private readonly bottomKey: string;
	private readonly style: (text: string) => string;
	private renderedText: string | undefined;
	private requestedLayoutRefresh = false;

	constructor(
		tui: any,
		locale: "en" | "zh",
		promptKey: string,
		bottomKey: string,
		style: (text: string) => string,
	) {
		super("", 0, 0);
		this.tui = tui;
		this.locale = locale;
		this.promptKey = promptKey;
		this.bottomKey = bottomKey;
		this.style = style;
	}

	override render(width: number): string[] {
		// Transcript navigation is implemented by Pi's fullscreen viewport. The
		// regular TUI has no application-owned scroll region, so rendering the
		// pill there would advertise shortcuts that cannot take effect.
		if (!isViewportTUI(this.tui)) return [];
		const tui: any = this.tui;
		if (!tui.currentLayout && !this.requestedLayoutRefresh) {
			this.requestedLayoutRefresh = true;
			queueMicrotask(() => tui.requestRender?.());
		}
		const label = getTranscriptNavigationPill(this.locale, this.promptKey, this.bottomKey, getNavigationPosition(tui));
		const pill = this.style(` ${label} `);
		const leftPadding = Math.max(0, Math.floor((width - visibleWidth(pill)) / 2));
		const text = `${" ".repeat(leftPadding)}${pill}`;
		if (text !== this.renderedText) {
			this.renderedText = text;
			this.setText(text);
		}
		return super.render(width);
	}
}

function createBuiltInTools(cwd: string) {
	return {
		bash: createBashToolDefinition(cwd),
		read: createReadToolDefinition(cwd),
		write: createWriteToolDefinition(cwd),
		edit: createEditToolDefinition(cwd),
		find: createFindToolDefinition(cwd),
		grep: createGrepToolDefinition(cwd),
		ls: createLsToolDefinition(cwd),
	};
}

const toolCache = new Map<string, BuiltInTools>();

function getBuiltInTools(cwd: string): BuiltInTools {
	let tools = toolCache.get(cwd);
	if (!tools) {
		tools = createBuiltInTools(cwd);
		if (toolCache.size >= 8) {
			const oldest = toolCache.keys().next().value;
			if (oldest) toolCache.delete(oldest);
		}
		toolCache.set(cwd, tools);
	}
	return tools;
}

function renderContext(context: any): RenderContext {
	return context as RenderContext;
}

function configureNavigationKeybindings(): void {
	if (process.platform !== "darwin") return;
	const keybindings = getKeybindings();
	const userBindings = keybindings.getUserBindings();
	const nextBindings = { ...userBindings };
	let changed = false;
	if (userBindings["tui.altScreen.previousPrompt"] === undefined) {
		nextBindings["tui.altScreen.previousPrompt"] = MAC_PROMPT_NAVIGATION_KEY;
		changed = true;
	}
	if (userBindings["tui.altScreen.bottom"] === undefined) {
		nextBindings["tui.altScreen.bottom"] = MAC_BOTTOM_NAVIGATION_KEY;
		changed = true;
	}
	if (changed) keybindings.setUserBindings(nextBindings);
}

function setNavigationHint(ctx: any, config: BrieflyConfig): void {
	if (!ctx.hasUI || ctx.mode !== "tui") return;
	configureNavigationKeybindings();
	ctx.ui.setWidget(
		NAVIGATION_HINT_WIDGET_KEY,
		(tui: any, theme: Theme) =>
			new DynamicNavigationHint(
				tui,
				resolveLocale(config),
				keyText("tui.altScreen.previousPrompt"),
				keyText("tui.altScreen.bottom"),
				(text) => theme.bg("selectedBg", theme.fg("text", text)),
			),
		{ placement: "aboveEditor" },
	);
}

function setStickyPromptPreview(ctx: any): void {
	if (!ctx.hasUI || ctx.mode !== "tui") return;

	// This is a small fullscreen-only prototype. Calling done immediately in
	// regular TUI avoids leaving a persistent overlay that would block
	// interactions, while fullscreen gets a passive, screen-relative preview.
	void ctx.ui.custom(
		(tui: any, theme: Theme, _keybindings: any, done: () => void) => {
			if (!isViewportTUI(tui)) {
				done();
				return new Text("", 0, 0);
			}
			installUserPromptNavigation(tui, ctx.sessionManager);
			return new StickyPromptPreview(
				tui,
				ctx.sessionManager,
				(text) => theme.bg("selectedBg", text),
				(text) => theme.bold(theme.fg("accent", text)),
				(text) => theme.fg("text", text),
			);
		},
		{
			overlay: true,
			overlayOptions: {
				anchor: "top-left",
				width: "100%",
				maxHeight: 1,
				nonCapturing: true,
			},
		},
	);
}

/**
 * Pi exposes no transcript-refresh hook, and `setHiddenThinkingLabel` only
 * touches thinking blocks. Re-applying the tool-expansion state is the one path
 * that rebuilds the assistant rows containing tool calls, so the current value
 * is restored immediately: the rows are reconstructed within the same tick, and
 * the caller's notification replaces its transient native status message.
 */
function refreshTranscript(ctx: any): void {
	if (!ctx?.hasUI) return;
	const expanded = ctx.ui.getToolsExpanded?.() === true;
	ctx.ui.setToolsExpanded?.(!expanded);
	ctx.ui.setToolsExpanded?.(expanded);
}

function registerToolOverride(
	pi: ExtensionAPI,
	toolName: ToolName,
	initialTool: AnyTool,
	getConfig: () => BrieflyConfig,
): void {
	const locale = (): "en" | "zh" => resolveLocale(getConfig());
	pi.registerTool({
		...initialTool,
		name: toolName,
		label: toolName,
		// The spread cannot prove ToolDefinition's required fields, so prompt
		// metadata is passed through explicitly.
		description: initialTool.description ?? toolName,
		renderShell: "self",
		// The schema follows the switch: `brief` exists only while terse mode is
		// on, so the model is never asked for a description nobody displays.
		parameters: getConfig().terse ? withBriefParameter(initialTool.parameters, locale()) : initialTool.parameters,
		prepareArguments(args: unknown) {
			// Keep the native shim (for example edit's legacy top-level
			// oldText/newText) and always hand validation a clean object.
			const native = typeof initialTool.prepareArguments === "function" ? initialTool.prepareArguments(args) : args;
			if (!getConfig().terse) return stripBriefParameter(native);
			return prepareBriefArguments(toolName, native, locale());
		},
		async execute(toolCallId: string, params: unknown, signal: AbortSignal | undefined, onUpdate: unknown, ctx: any) {
			const tools = getBuiltInTools(ctx.cwd) as Record<string, AnyTool>;
			return tools[toolName].execute(toolCallId, stripBriefParameter(params), signal, onUpdate, ctx);
		},
		renderCall(args: unknown, theme: Theme, context: any) {
			const currentContext = renderContext(context);
			return renderToolCall(
				toolName,
				initialTool.renderCall,
				args,
				theme,
				currentContext,
				presentationFor(getConfig(), currentContext.expanded),
				locale(),
			);
		},
		renderResult(result: any, options: any, theme: Theme, context: any) {
			const currentContext = renderContext(context);
			return renderToolResult(
				toolName,
				initialTool.renderResult,
				result,
				options,
				theme,
				currentContext,
				presentationFor(getConfig(), currentContext.expanded),
			);
		},
	});
}

export default function piBriefly(pi: ExtensionAPI): void {
	let currentConfig = loadConfig(process.cwd()).config;
	let turnTokens = 0;
	let turnStartedAt = Date.now();
	let workingStartedAt: number | undefined;
	let workingTimer: ReturnType<typeof setInterval> | undefined;
	const initial = getBuiltInTools(process.cwd()) as Record<string, AnyTool>;

	const getConfig = (): BrieflyConfig => currentConfig;

	pi.registerEntryRenderer(TURN_DURATION_TYPE, (entry, _options, theme) => {
		const data = entry.data as { durationMs?: number; locale?: string; spentTokens?: number };
		const locale = (data.locale === "zh" ? "zh" : data.locale === "en" ? "en" : resolveLocale(currentConfig)) as "en" | "zh";
		return new Text(theme.fg("dim", formatTook(data.durationMs ?? 0, locale, data.spentTokens)), 2, 0);
	});

	const reloadConfig = (cwd: string, notify?: (message: string, level: "info" | "warning" | "error") => void): void => {
		const loaded = loadConfig(cwd);
		currentConfig = loaded.config;
		for (const warning of loaded.warnings) notify?.(warning, "warning");
	};

	/**
	 * Re-registering the built-in overrides is how the switch takes effect:
	 * `pi.registerTool()` refreshes the tool registry immediately, so both the
	 * schema and the renderers follow the new value.
	 */
	const applyToolSchemas = (): void => {
		for (const toolName of toolNames) {
			registerToolOverride(pi, toolName, initial[toolName], getConfig);
		}
	};

	const applyPresentation = (ctx?: any): void => {
		applyToolSchemas();
		refreshTranscript(ctx);
	};

	const stopWorkingTimer = (ctx: any): void => {
		if (workingTimer) clearInterval(workingTimer);
		workingTimer = undefined;
		workingStartedAt = undefined;
		if (ctx.hasUI) ctx.ui.setWorkingMessage();
	};
	const startWorkingTimer = (ctx: any): void => {
		stopWorkingTimer(ctx);
		if (!ctx.hasUI) return;
		workingStartedAt = Date.now();
		const update = (): void => {
			// Keep the `Elapsed` value of running tool rows moving even when a tool
			// produces no output of its own.
			tickPendingTiming();
			if (workingStartedAt === undefined) return;
			const locale = resolveLocale(currentConfig);
			const elapsed = formatDuration(Date.now() - workingStartedAt, locale);
			ctx.ui.setWorkingMessage(workingMessage(locale, elapsed));
		};
		update();
		workingTimer = setInterval(update, 1000);
	};

	pi.on("session_start", async (_event, ctx) => {
		reloadConfig(ctx.cwd, ctx.hasUI ? (message, level) => ctx.ui.notify(message, level) : undefined);
		// Nothing is on screen yet, so only the schemas need to follow the switch
		// here; a transcript refresh would leave its status message behind.
		applyToolSchemas();
		setNavigationHint(ctx, currentConfig);
		setStickyPromptPreview(ctx);
	});
	pi.on("before_agent_start", async (event) => {
		if (!currentConfig.terse) return;
		const instruction = briefInstruction(resolveLocale(currentConfig));
		return { systemPrompt: `${event.systemPrompt}\n\n${instruction}` };
	});
	pi.on("agent_start", (_event, ctx) => {
		turnTokens = 0;
		turnStartedAt = Date.now();
		startWorkingTimer(ctx);
	});
	pi.on("message_end", (event) => {
		const message = event.message as any;
		if (message.role === "assistant" && typeof message.usage?.totalTokens === "number") {
			turnTokens += message.usage.totalTokens;
		}
	});
	pi.on("agent_end", (_event, ctx) => stopWorkingTimer(ctx));
	pi.on("agent_settled", (_event, _ctx) => {
		// Timing is the final transcript entry of the turn, in both switch
		// positions.
		if (!showsTurnDuration()) return;
		pi.appendEntry(TURN_DURATION_TYPE, {
			durationMs: Date.now() - turnStartedAt,
			locale: resolveLocale(currentConfig),
			spentTokens: turnTokens > 0 ? turnTokens : undefined,
		});
	});
	pi.on("session_shutdown", (_event, ctx) => stopWorkingTimer(ctx));

	for (const toolName of toolNames) {
		registerToolOverride(pi, toolName, initial[toolName], getConfig);
	}

	pi.registerCommand("briefly", {
		description: "Toggle pi-briefly terse mode",
		handler: async (args, ctx) => {
			const command = args.trim().toLowerCase();
			const locale = resolveLocale(currentConfig);
			if (command === "show") {
				ctx.ui.notify(JSON.stringify(currentConfig, null, 2), "info");
				return;
			}
			if (command === "reload") {
				reloadConfig(ctx.cwd, (message, level) => ctx.ui.notify(message, level));
				applyPresentation(ctx);
				setNavigationHint(ctx, currentConfig);
				ctx.ui.notify(notifyReloaded(locale, currentConfig.terse), "info");
				return;
			}
			if (command.startsWith("locale ")) {
				const next = command.slice(7).trim() as Locale;
				if (next === "en" || next === "zh" || next === "auto") {
					currentConfig = setLocale(currentConfig, next);
					saveConfig(ctx.cwd, "project", currentConfig);
					applyPresentation(ctx);
					setNavigationHint(ctx, currentConfig);
					ctx.ui.notify(notifyLocale(locale, next), "info");
					return;
				}
			}
			const next = command === "on" ? true : command === "off" ? false : command === "" ? !currentConfig.terse : undefined;
			if (next === undefined) {
				ctx.ui.notify(notifyUsage(locale), "warning");
				return;
			}
			currentConfig = setTerse(currentConfig, next);
			saveConfig(ctx.cwd, "project", currentConfig);
			applyPresentation(ctx);
			ctx.ui.notify(notifyToggled(locale, next), "info");
		},
	});
}
