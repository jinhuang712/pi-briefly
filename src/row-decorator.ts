/**
 * The row decorator hub: how a tool owned by another extension hands its
 * presentation over to pi-briefly.
 *
 * Pi has no renderer-only override. `registerTool()` is the only entry point and
 * it takes over execution, so an extension can restyle its own rows but nobody
 * can restyle another extension's rows. The way out is a handshake: the tool's
 * owner keeps execution, schema and description, and asks this hub for
 * presentation slots right before registering.
 *
 *     const hub = globalThis[Symbol.for("pi.toolRowDecorator.v1")];
 *     const decoration = hub?.decorate({
 *       tool: "websearch",
 *       native: { renderCall, renderShell: "default" },
 *     });
 *     pi.registerTool(decoration ? { ...definition, ...decoration } : definition);
 *
 * A consumer must query the hub while every extension is loaded - in a
 * `session_start` handler - and re-apply through `subscribe()`, for two reasons:
 * it may load before pi-briefly, and the terse switch can be flipped mid-session.
 * The hub decorates while terse mode is on only; with it off the owner's own row
 * stays untouched, which keeps Pi's native presentation honest for tools whose
 * native renderers pi-briefly cannot reproduce.
 */

import type { Theme } from "@earendil-works/pi-coding-agent";
import type { Component } from "@earendil-works/pi-tui";
import {
	type DisplayResult,
	type NativeCallRenderer,
	type NativeResultRenderer,
	type RenderContext,
	renderToolCall,
	renderToolResult,
} from "./native-decorator.ts";
import { resolveLocale } from "./i18n.ts";
import { presentationFor } from "./policy.ts";
import type { BrieflyConfig } from "./types.ts";

/** The one fixed point of the handshake. Versioned so a future contract is additive. */
export const TOOL_ROW_DECORATOR_KEY = Symbol.for("pi.toolRowDecorator.v1");

/**
 * Slots Pi hands to a renderer. The owner passes its own native renderers along
 * so the expanded row and terse-off still render exactly as before.
 */
export interface ToolRowDecorationRequest {
	tool: string;
	/**
	 * Optional wording for this tool's rows. A name like `search` or `fetch` means
	 * different things in different extensions, so its owner declares the verb;
	 * it outranks pi-briefly's own table without touching the rendering.
	 */
	purpose?: { en: string; zh: string };
	native?: {
		renderCall?: NativeCallRenderer;
		renderResult?: NativeResultRenderer;
		renderShell?: "default" | "self";
	};
	/**
	 * Reserved. v1 decorates rendering only, but an owner hands its schema over
	 * now so a later `brief` injection needs no change at the call site.
	 */
	schema?: {
		parameters?: unknown;
		prepareArguments?: (args: unknown) => unknown;
	};
}

/**
 * A presentation patch, spread over the owner's own definition. Assignable to
 * any tool definition, because the owner's generics are its own business.
 */
export interface ToolRowDecoration {
	renderCall?: (args: any, theme: Theme, context: any) => Component;
	renderResult?: (result: any, options: any, theme: Theme, context: any) => Component;
	renderShell?: "default" | "self";
	parameters?: unknown;
	prepareArguments?: (args: unknown) => unknown;
}

export interface ToolRowDecoratorHub {
	/** Presentation slots for a tool while terse mode is on, otherwise nothing. */
	decorate(request: ToolRowDecorationRequest): ToolRowDecoration | undefined;
	/** Called when the decoration a tool should apply may have changed. */
	subscribe(listener: () => void): () => void;
}

export interface ToolRowDecoratorOptions {
	config: () => BrieflyConfig;
}

/**
 * Publish the hub on `globalThis` and return the notifier that tells subscribed
 * tool owners to re-apply. Called once per extension load; a later load (for
 * example after `/reload`) replaces the hub, and owners re-subscribe on the
 * `session_start` that follows.
 */
export function installToolRowDecoratorHub(options: ToolRowDecoratorOptions): () => void {
	const listeners = new Set<() => void>();
	const hub: ToolRowDecoratorHub = {
		decorate(request) {
			if (!options.config().terse) return undefined;
			return {
				renderShell: "self",
				renderCall(args, theme, context) {
					const current = context as RenderContext;
					const config = options.config();
					return renderToolCall(
						request.tool,
						request.native?.renderCall,
						args,
						theme,
						current,
						presentationFor(config, current?.expanded === true),
						resolveLocale(config),
						request.purpose,
					);
				},
				renderResult(result, renderOptions, theme, context) {
					const current = context as RenderContext;
					const config = options.config();
					return renderToolResult(
						request.tool,
						request.native?.renderResult,
						result as DisplayResult,
						renderOptions,
						theme,
						current,
						presentationFor(config, current?.expanded === true),
					);
				},
			};
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
	(globalThis as Record<PropertyKey, unknown>)[TOOL_ROW_DECORATOR_KEY] = hub;
	return () => {
		for (const listener of [...listeners]) listener();
	};
}

/** The hub as a tool owner sees it, for tests and for tooling. */
export function readToolRowDecoratorHub(): ToolRowDecoratorHub | undefined {
	const hub = (globalThis as Record<PropertyKey, unknown>)[TOOL_ROW_DECORATOR_KEY];
	return typeof (hub as ToolRowDecoratorHub | undefined)?.decorate === "function" ? (hub as ToolRowDecoratorHub) : undefined;
}
