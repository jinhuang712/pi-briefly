/**
 * pi-briefly: native-first, configurable built-in tool presentation.
 *
 * Tool execution stays delegated to Pi's built-in implementations. Renderers
 * decorate those native components according to an immutable preset.
 */

import { DynamicBorder, type ExtensionAPI, type Theme } from "@earendil-works/pi-coding-agent";
import { Container, SelectList, Spacer, Text, type SelectItem } from "@earendil-works/pi-tui";
import {
	createBashToolDefinition,
	createEditToolDefinition,
	createFindToolDefinition,
	createGrepToolDefinition,
	createLsToolDefinition,
	createReadToolDefinition,
	createWriteToolDefinition,
	keyHint,
} from "@earendil-works/pi-coding-agent";
import { loadConfig, saveConfig, setLocale, setMode } from "./config.ts";
import { toolBrief } from "./brief.ts";
import {
	getCollapsedThinkingLabel,
	getCommonFeatures,
	getCurrentModeSuffix,
	getHiddenThinkingStub,
	getHiddenToolsSummary,
	getThinkingBriefLabel,
	getModeDescription,
	getSelectorTitle,
	notifyCurrentMode,
	notifyModeChanged,
	notifyReloaded,
	notifyReset,
	resolveLocale,
	workingMessage,
} from "./i18n.ts";
import { LifecycleController } from "./lifecycle.ts";
import { renderCallWithStyle, renderResultWithStyle, type RenderContext } from "./native-decorator.ts";
import { resolveSlot, showsTurnDuration } from "./policy.ts";
import { formatCollapseSummary, formatDuration, formatTook } from "./summary.ts";
import { isAlreadyCondensedThinking, resolveThinkingPresentation, thinkingBrief } from "./thinking.ts";
import { type BrieflyConfig, type Locale, type PresetMode, toolNames } from "./types.ts";

type BuiltInTools = ReturnType<typeof createBuiltInTools>;
type AnyTool = Record<string, any>;

const COLLAPSE_SUMMARY_TYPE = "pi-briefly-collapse-summary";
const TURN_DURATION_TYPE = "pi-briefly-turn-duration";
const HIDDEN_SUMMARY_TYPE = "pi-briefly-hidden-summary";

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

function isToolName(value: string): value is ToolName {
	return (toolNames as readonly string[]).includes(value);
}

function collapseSummary(ctx: any, lifecycle: LifecycleController, turnTokens: number, config: BrieflyConfig): string {
	const stats = lifecycle.statistics();
	return formatCollapseSummary(
		stats,
		Date.now() - stats.startedAt,
		ctx.getContextUsage?.(),
		turnTokens,
		resolveLocale(config),
	);
}

function renderContext(context: any): RenderContext {
	return context as RenderContext;
}

function useNativeExpandedPresentation(mode: PresetMode, toolName: ToolName, expanded: boolean): boolean {
	if (!expanded) return false;
	if (mode === "collapse" || mode === "hidden") return true;
	return mode === "compact" && (toolName === "edit" || toolName === "write");
}

function modeSelectorItems(ordered: PresetMode[], currentMode: PresetMode, locale: "en" | "zh"): SelectItem[] {
	const suffix = getCurrentModeSuffix(locale);
	return ordered.map((mode) => ({
		value: mode,
		label: mode === currentMode ? `✓ ${mode}` : mode,
		description: mode === currentMode ? `${getModeDescription(locale, mode)} ${suffix}` : getModeDescription(locale, mode),
	}));
}

async function selectMode(ctx: any, ordered: PresetMode[], currentMode: PresetMode, locale: "en" | "zh"): Promise<PresetMode | undefined> {
	const items = modeSelectorItems(ordered, currentMode, locale);
	const title = `${getSelectorTitle(locale)} — ${currentMode}`;
	if (ctx.mode !== "tui") {
		const options = items.map((item) => `${item.label} — ${item.description}`);
		const selected = await ctx.ui.select(title, options);
		return items.find((item) => `${item.label} — ${item.description}` === selected)?.value as PresetMode | undefined;
	}

	return ctx.ui.custom<PresetMode | undefined>((tui: any, theme: Theme, _keybindings: any, done: (value: PresetMode | undefined) => void) => {
		const container = new Container();
		const border = new DynamicBorder((text: string) => theme.fg("accent", text));
		const bottomBorder = new DynamicBorder((text: string) => theme.fg("accent", text));
		container.addChild(border);
		container.addChild(new Spacer(1));
		container.addChild(new Text(theme.fg("accent", theme.bold(title)), 1, 0));
		container.addChild(new Spacer(1));
		const selectList = new SelectList(items, items.length, {
			selectedPrefix: (text) => theme.fg("accent", text),
			selectedText: (text) => theme.fg("accent", text),
			description: (text) => theme.fg("dim", text),
			scrollInfo: (text) => theme.fg("dim", text),
			noMatch: (text) => theme.fg("warning", text),
		});
		selectList.onSelect = (item) => done(item.value as PresetMode);
		selectList.onCancel = () => done(undefined);
		container.addChild(selectList);
		container.addChild(new Spacer(1));
		container.addChild(new Text(theme.fg("dim", getCommonFeatures(locale)), 1, 0));
		container.addChild(new Spacer(1));
		container.addChild(new Text(theme.fg("dim", `${keyHint("tui.select.confirm", "select")}  ${keyHint("tui.select.cancel", "cancel")}`), 1, 0));
		container.addChild(new Spacer(1));
		container.addChild(bottomBorder);
		return {
			render(width: number): string[] {
				return container.render(width);
			},
			invalidate(): void {
				container.invalidate();
			},
			handleInput(data: string): void {
				selectList.handleInput(data);
				tui.requestRender();
			},
		};
	});
}

function registerToolOverride(
	pi: ExtensionAPI,
	toolName: ToolName,
	initialTool: AnyTool,
	getConfig: () => BrieflyConfig,
	lifecycle: LifecycleController,
	onToolsExpanded: (expanded: boolean) => void,
): void {
	pi.registerTool({
		...initialTool,
		name: toolName,
		label: toolName,
		renderShell: "self",
		async execute(toolCallId: string, params: unknown, signal: AbortSignal | undefined, onUpdate: unknown, ctx: any) {
			const tools = getBuiltInTools(ctx.cwd) as Record<string, AnyTool>;
			return tools[toolName].execute(toolCallId, params, signal, onUpdate, ctx);
		},
		renderCall(args: unknown, theme: Theme, context: any) {
			const currentContext = renderContext(context);
			onToolsExpanded(currentContext.expanded);
			lifecycle.ensure(currentContext.toolCallId, toolName, currentContext.args);
			lifecycle.registerInvalidation(currentContext.toolCallId, currentContext.invalidate);
			const mode = getConfig().mode;
			const resolvedPolicy = resolveSlot(getConfig(), toolName, "call", lifecycle.view(currentContext.toolCallId));
			const policy = useNativeExpandedPresentation(mode, toolName, currentContext.expanded)
				? { ...resolvedPolicy, style: "full" as const }
				: resolvedPolicy;
			const renderArgs = toolName === "write" && policy.showContent === false
				? { ...((args ?? {}) as Record<string, unknown>), content: "" }
				: toolName === "bash" && policy.showCommand === false
					? { ...((args ?? {}) as Record<string, unknown>), command: "..." }
					: args;
			const callLocale = resolveLocale(getConfig());
			return renderCallWithStyle(
				initialTool.renderCall,
				renderArgs,
				theme,
				currentContext,
				policy,
				toolBrief(toolName, (args ?? {}) as Record<string, unknown>, callLocale),
				keyHint("app.tools.expand", "to expand"),
				undefined,
				callLocale,
			);
		},
		renderResult(result: any, options: any, theme: Theme, context: any) {
			const currentContext = renderContext(context);
			onToolsExpanded(currentContext.expanded);
			lifecycle.ensure(currentContext.toolCallId, toolName, currentContext.args);
			lifecycle.registerInvalidation(currentContext.toolCallId, currentContext.invalidate);
			const mode = getConfig().mode;
			const resolvedPolicy = resolveSlot(getConfig(), toolName, "result", lifecycle.view(currentContext.toolCallId));
			const policy = useNativeExpandedPresentation(mode, toolName, currentContext.expanded)
				? { ...resolvedPolicy, style: "full" as const }
				: resolvedPolicy;
			const resultLocale = resolveLocale(getConfig());
			return renderResultWithStyle(
				initialTool.renderResult,
				result,
				options,
				theme,
				currentContext,
				policy,
				toolBrief(toolName, (currentContext.args ?? {}) as Record<string, unknown>, resultLocale),
				keyHint("app.tools.expand", "to expand"),
				resultLocale,
			);
		},
	});
}

export default function piBriefly(pi: ExtensionAPI): void {
	let currentConfig = loadConfig(process.cwd()).config;
	const lifecycle = new LifecycleController();
	let turnTokens = 0;
	let workingStartedAt: number | undefined;
	let workingTimer: ReturnType<typeof setInterval> | undefined;
	const initial = getBuiltInTools(process.cwd()) as Record<string, AnyTool>;
	let toolsExpanded = false;
	let refreshAssistantComponents: (() => void) | undefined;

	const getConfig = (): BrieflyConfig => currentConfig;
	pi.registerEntryRenderer(COLLAPSE_SUMMARY_TYPE, (entry, { expanded }, theme) => {
		const data = entry.data as { summary?: string };
		const summary = data.summary ?? "collapse summary";
		const hint = keyHint("app.tools.expand", expanded ? "to collapse" : "to expand");
		return new Text(
			`${theme.fg("success", "✓")} ${theme.fg("muted", summary)} ${theme.fg("dim", `(${hint})`)}`,
			0,
			0,
		);
	});
	pi.registerEntryRenderer(TURN_DURATION_TYPE, (entry, _options, theme) => {
		const data = entry.data as { durationMs?: number; locale?: string; spentTokens?: number };
		const locale = (data.locale === "zh" ? "zh" : data.locale === "en" ? "en" : resolveLocale(currentConfig)) as "en" | "zh";
		return new Text(theme.fg("dim", formatTook(data.durationMs ?? 0, locale, data.spentTokens)), 2, 0);
	});
	pi.registerEntryRenderer(HIDDEN_SUMMARY_TYPE, (entry, { expanded }, theme) => {
		const data = entry.data as { count?: number; locale?: string };
		const locale = (data.locale === "zh" ? "zh" : data.locale === "en" ? "en" : resolveLocale(currentConfig)) as "en" | "zh";
		const text = getHiddenToolsSummary(locale, data.count ?? 0);
		const hint = keyHint("app.tools.expand", expanded ? "to collapse" : "to expand");
		return new Text(`${theme.fg("dim", text)} ${theme.fg("dim", `(${hint})`)}`, 0, 0);
	});
	pi.registerMarkdownTransformer((markdown, { messageType, isStreaming }) => {
		if (messageType !== "assistant-thinking") return markdown;
		const presentation = resolveThinkingPresentation(currentConfig.mode, {
			streaming: isStreaming,
			settled: lifecycle.isSettled(),
			expanded: toolsExpanded,
		});
		if (presentation === "native") return markdown;
		if (presentation === "suppressed") return "";
		const locale = resolveLocale(currentConfig);
		if (presentation === "collapsed") return getCollapsedThinkingLabel(locale);
		if (presentation === "hiddenStub") return getHiddenThinkingStub(locale);
		if (isAlreadyCondensedThinking(markdown)) return markdown;
		return thinkingBrief(markdown, getThinkingBriefLabel(locale));
	});
	const reloadConfig = (cwd: string, notify?: (message: string, level: "info" | "warning" | "error") => void): void => {
		const loaded = loadConfig(cwd);
		currentConfig = loaded.config;
		lifecycle.refresh();
		for (const warning of loaded.warnings) notify?.(warning, "warning");
	};
	const refreshAssistantMessages = (ctx: any): void => {
		if (!ctx.hasUI) return;
		toolsExpanded = ctx.ui.getToolsExpanded();
		refreshAssistantComponents = () => ctx.ui.setHiddenThinkingLabel();
		ctx.ui.setHiddenThinkingLabel();
	};
	const onToolsExpanded = (expanded: boolean): void => {
		if (toolsExpanded === expanded) return;
		toolsExpanded = expanded;
		if (lifecycle.isSettled()) refreshAssistantComponents?.();
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
	});
	pi.on("agent_start", (_event, ctx) => {
		turnTokens = 0;
		lifecycle.beginAgent();
		startWorkingTimer(ctx);
	});
	pi.on("message_end", (event) => {
		const message = event.message as any;
		if (message.role === "assistant" && typeof message.usage?.totalTokens === "number") {
			turnTokens += message.usage.totalTokens;
		}
	});
	pi.on("tool_execution_start", (event) => {
		if (isToolName(event.toolName)) lifecycle.start(event.toolCallId, event.toolName, event.args);
	});
	pi.on("tool_execution_end", (event) => lifecycle.complete(event.toolCallId, event.isError));
	pi.on("agent_end", (_event, ctx) => stopWorkingTimer(ctx));
	pi.on("agent_settled", (_event, ctx) => {
		stopWorkingTimer(ctx);
		const stats = lifecycle.statistics();
		const turnDurationMs = Date.now() - stats.startedAt;
		const summary = collapseSummary(ctx, lifecycle, turnTokens, currentConfig);
		lifecycle.settleAgent(summary);
		if (currentConfig.mode !== "visible") {
			// Rebuild assistant message components so settled thinking blocks run
			// through the condensing transformer in every non-visible mode, along
			// with tool rows in collapse mode.
			refreshAssistantMessages(ctx);
		}
		if (showsTurnDuration(currentConfig.mode)) {
			pi.appendEntry(TURN_DURATION_TYPE, {
				durationMs: turnDurationMs,
				locale: resolveLocale(currentConfig),
				spentTokens: turnTokens > 0 ? turnTokens : undefined,
			});
		}
		if (currentConfig.mode === "collapse" && stats.toolCalls > 0) {
			pi.appendEntry(COLLAPSE_SUMMARY_TYPE, { summary });
		}
		if (currentConfig.mode === "hidden" && stats.toolCalls > 0) {
			pi.appendEntry(HIDDEN_SUMMARY_TYPE, { count: stats.toolCalls, locale: resolveLocale(currentConfig) });
		}
	});
	pi.on("session_shutdown", (_event, ctx) => {
		stopWorkingTimer(ctx);
		lifecycle.clear();
	});

	for (const toolName of toolNames) {
		registerToolOverride(pi, toolName, initial[toolName], getConfig, lifecycle, onToolsExpanded);
	}

	pi.registerCommand("briefly", {
		description: "Choose or inspect pi-briefly presentation mode",
		handler: async (args, ctx) => {
			const command = args.trim();
			const locale = resolveLocale(currentConfig);
			if (command === "show") {
				ctx.ui.notify(JSON.stringify(currentConfig, null, 2), "info");
				return;
			}
			if (command === "reload") {
				reloadConfig(ctx.cwd, (message, level) => ctx.ui.notify(message, level));
				refreshAssistantMessages(ctx);
				ctx.ui.notify(notifyReloaded(locale, currentConfig.mode), "info");
				return;
			}
			if (command === "reset") {
				currentConfig = setMode(currentConfig, "visible");
				lifecycle.refresh();
				refreshAssistantMessages(ctx);
				saveConfig(ctx.cwd, "project", currentConfig);
				ctx.ui.notify(notifyReset(locale), "info");
				return;
			}
			if (command && ["visible", "compact", "collapse", "hidden"].includes(command)) {
				currentConfig = setMode(currentConfig, command as PresetMode);
				lifecycle.refresh();
				refreshAssistantMessages(ctx);
				saveConfig(ctx.cwd, "project", currentConfig);
				ctx.ui.notify(notifyModeChanged(locale, currentConfig.mode), "info");
				return;
			}
			if (command.startsWith("locale ")) {
				const next = command.slice(7).trim() as Locale;
				if (next === "en" || next === "zh" || next === "auto") {
					currentConfig = setLocale(currentConfig, next);
					lifecycle.refresh();
					refreshAssistantMessages(ctx);
					saveConfig(ctx.cwd, "project", currentConfig);
					ctx.ui.notify(locale === "zh" ? `语言已切换为 ${next}` : `Locale set to ${next}`, "info");
					return;
				}
			}
			if (!ctx.hasUI) {
				ctx.ui.notify(notifyCurrentMode(locale, currentConfig.mode), "info");
				return;
			}
			const modes: PresetMode[] = ["visible", "compact", "collapse", "hidden"];
			// The active mode is listed first, marked, and named in the title so the
			// user can always tell which mode is selected before switching.
			const currentMode = currentConfig.mode;
			const ordered = [currentMode, ...modes.filter((mode) => mode !== currentMode)];
			const selected = await selectMode(ctx, ordered, currentMode, locale);
			if (!selected || !modes.includes(selected)) return;
			currentConfig = setMode(currentConfig, selected);
			lifecycle.refresh();
			refreshAssistantMessages(ctx);
			saveConfig(ctx.cwd, "project", currentConfig);
			ctx.ui.notify(notifyModeChanged(resolveLocale(currentConfig), currentConfig.mode), "info");
		},
	});
}
