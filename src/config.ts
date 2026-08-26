import { CONFIG_DIR_NAME, getAgentDir } from "@earendil-works/pi-coding-agent";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { BrieflyConfig, ConfigScope, PresetMode } from "./types.ts";

const presetModes = new Set<PresetMode>(["visible", "compact", "collapse", "hidden"]);

export const defaultConfig: BrieflyConfig = {
	version: 1,
	mode: "visible",
};

export interface LoadedConfig {
	config: BrieflyConfig;
	warnings: string[];
	paths: { global: string; project: string };
}

type PartialConfig = { mode?: PresetMode };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseConfig(value: unknown, source: string): { config: PartialConfig; warnings: string[] } {
	const warnings: string[] = [];
	if (!isRecord(value)) return { config: {}, warnings: [`${source} must contain a JSON object`] };

	const config: PartialConfig = {};
	if (value.version !== undefined && value.version !== 1) {
		warnings.push(`${source}.version is unsupported; using version 1 defaults`);
	}
	if (typeof value.mode === "string" && presetModes.has(value.mode as PresetMode)) {
		config.mode = value.mode as PresetMode;
	} else if (value.mode !== undefined) {
		warnings.push(`${source}.mode is invalid; using the previous mode`);
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
		version: 1,
		mode: project.config.mode ?? global.config.mode ?? defaultConfig.mode,
	};
	return { config, warnings: [...global.warnings, ...project.warnings], paths };
}

export function saveConfig(cwd: string, scope: ConfigScope, config: BrieflyConfig): string {
	const path = configPaths(cwd)[scope];
	mkdirSync(join(path, ".."), { recursive: true });
	const temporaryPath = `${path}.tmp-${process.pid}`;
	writeFileSync(temporaryPath, `${JSON.stringify({ version: 1, mode: config.mode }, null, 2)}\n`, {
		encoding: "utf8",
		mode: 0o600,
	});
	renameSync(temporaryPath, path);
	return path;
}

export function setMode(config: BrieflyConfig, mode: PresetMode): BrieflyConfig {
	return { version: 1, mode };
}
