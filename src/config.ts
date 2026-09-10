import { CONFIG_DIR_NAME, getAgentDir } from "@earendil-works/pi-coding-agent";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isLocale } from "./i18n.ts";
import type { BrieflyConfig, ConfigScope, Locale } from "./types.ts";

export const CONFIG_VERSION = 2;

export const defaultConfig: BrieflyConfig = {
	version: CONFIG_VERSION,
	terse: false,
	locale: "auto",
};

export interface LoadedConfig {
	config: BrieflyConfig;
	warnings: string[];
	paths: { global: string; project: string };
}

type PartialConfig = { terse?: boolean; locale?: Locale };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseConfig(value: unknown, source: string): { config: PartialConfig; warnings: string[] } {
	const warnings: string[] = [];
	if (!isRecord(value)) return { config: {}, warnings: [`${source} must contain a JSON object`] };

	const config: PartialConfig = {};
	if (value.mode !== undefined) {
		// pi-briefly used to offer visible/compact/collapse/hidden presets. They
		// never solved the noise problem, so presentation is now one switch.
		warnings.push(`${source}: "mode" was removed; pi-briefly now has a single terse switch (run /briefly)`);
	} else if (value.version !== undefined && value.version !== CONFIG_VERSION) {
		warnings.push(`${source}: unsupported version ${String(value.version)}; using pi-briefly ${CONFIG_VERSION} defaults`);
	}
	if (typeof value.terse === "boolean") {
		config.terse = value.terse;
	} else if (value.terse !== undefined) {
		warnings.push(`${source}: "terse" must be true or false; ignoring it`);
	}
	if (isLocale(value.locale)) {
		config.locale = value.locale as Locale;
	} else if (value.locale !== undefined) {
		warnings.push(`${source}: "locale" is invalid; using the previous locale`);
	}
	return { config, warnings };
}

function readConfigFile(path: string): { config: PartialConfig; warnings: string[] } {
	try {
		const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
		return parseConfig(raw, path);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return { config: {}, warnings: [] };
		return { config: {}, warnings: [`Could not load ${path}: ${String(error)}`] };
	}
}

export function configPaths(cwd: string): { global: string; project: string } {
	return {
		global: join(getAgentDir(), "pi-briefly.json"),
		project: join(cwd, CONFIG_DIR_NAME, "pi-briefly.json"),
	};
}

export function loadConfig(cwd: string): LoadedConfig {
	const paths = configPaths(cwd);
	const global = readConfigFile(paths.global);
	const project = readConfigFile(paths.project);
	const config: BrieflyConfig = {
		version: CONFIG_VERSION,
		terse: project.config.terse ?? global.config.terse ?? defaultConfig.terse,
		locale: project.config.locale ?? global.config.locale ?? defaultConfig.locale,
	};
	return { config, warnings: [...global.warnings, ...project.warnings], paths };
}

export function saveConfig(cwd: string, scope: ConfigScope, config: BrieflyConfig): string {
	const path = configPaths(cwd)[scope];
	mkdirSync(join(path, ".."), { recursive: true });
	const temporaryPath = `${path}.tmp-${process.pid}`;
	writeFileSync(
		temporaryPath,
		`${JSON.stringify({ version: CONFIG_VERSION, terse: config.terse, locale: config.locale }, null, 2)}\n`,
		{ encoding: "utf8", mode: 0o600 },
	);
	renameSync(temporaryPath, path);
	return path;
}

export function setTerse(config: BrieflyConfig, terse: boolean): BrieflyConfig {
	return { version: CONFIG_VERSION, terse, locale: config.locale };
}

export function setLocale(config: BrieflyConfig, locale: Locale): BrieflyConfig {
	return { version: CONFIG_VERSION, terse: config.terse, locale };
}
