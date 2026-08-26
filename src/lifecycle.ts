import type { LifecycleView, ToolName } from "./types.ts";

interface ToolCallRecord {
	toolCallId: string;
	toolName: ToolName;
	runID: number;
	status: "running" | "completed" | "error";
	settled: boolean;
	summary?: string;
	invalidate?: () => void;
}

interface RunState {
	runID: number;
	startedAt: number;
	firstToolCallID?: string;
	toolCallIDs: Set<string>;
	filesRead: Set<string>;
	errors: number;
	settled: boolean;
}

export interface RunStatistics {
	startedAt: number;
	toolCalls: number;
	filesRead: number;
	errors: number;
}

export class LifecycleController {
	private readonly calls = new Map<string, ToolCallRecord>();
	private readonly runs = new Map<number, RunState>();
	private runSequence = 0;
	private currentRun: RunState = this.newRun(0);
	private settled = false;
	private sessionActive = true;

	private newRun(runID: number): RunState {
		const run: RunState = {
			runID,
			startedAt: Date.now(),
			toolCallIDs: new Set(),
			filesRead: new Set(),
			errors: 0,
			settled: false,
		};
		this.runs.set(runID, run);
		return run;
	}

	ensure(toolCallID: string, toolName: ToolName, args?: Record<string, unknown>): void {
		const existing = this.calls.get(toolCallID);
		if (existing) {
			this.recordArgs(existing, args);
			return;
		}
		this.start(toolCallID, toolName, args);
	}

	start(toolCallID: string, toolName: ToolName, args?: Record<string, unknown>): void {
		if (!this.sessionActive || this.calls.has(toolCallID)) return;
		this.currentRun.settled = false;
		this.settled = false;
		this.currentRun.toolCallIDs.add(toolCallID);
		this.currentRun.firstToolCallID ??= toolCallID;
		const call: ToolCallRecord = {
			toolCallID,
			toolName,
			runID: this.currentRun.runID,
			status: "running",
			settled: false,
		};
		this.calls.set(toolCallID, call);
		this.recordArgs(call, args);
		this.invalidateAll();
	}

	complete(toolCallID: string, isError: boolean): void {
		const call = this.calls.get(toolCallID);
		if (!call) return;
		call.status = isError ? "error" : "completed";
		const run = this.runs.get(call.runID);
		if (run && isError) run.errors++;
		this.invalidateAll();
	}

	beginAgent(): void {
		this.sessionActive = true;
		this.runSequence++;
		this.currentRun = this.newRun(this.runSequence);
		this.settled = false;
		this.invalidateAll();
	}

	settleAgent(summary?: string): void {
		if (!this.sessionActive) return;
		this.currentRun.settled = true;
		this.settled = true;
		for (const callID of this.currentRun.toolCallIDs) {
			const call = this.calls.get(callID);
			if (!call) continue;
			call.settled = true;
			call.summary = summary;
		}
		this.invalidateAll();
	}

	registerInvalidation(toolCallID: string, invalidate: () => void): void {
		const call = this.calls.get(toolCallID);
		if (call) call.invalidate = invalidate;
	}

	view(toolCallID: string): LifecycleView {
		const call = this.calls.get(toolCallID);
		return {
			isActive: call?.status === "running",
			isSettled: call?.settled ?? false,
		};
	}

	statistics(): RunStatistics {
		return {
			startedAt: this.currentRun.startedAt,
			toolCalls: this.currentRun.toolCallIDs.size,
			filesRead: this.currentRun.filesRead.size,
			errors: this.currentRun.errors,
		};
	}

	isSettled(): boolean {
		return this.settled;
	}

	summaryFor(toolCallID: string): string | undefined {
		const call = this.calls.get(toolCallID);
		if (!call?.summary) return undefined;
		const run = this.runs.get(call.runID);
		return run?.firstToolCallID === toolCallID ? call.summary : undefined;
	}

	refresh(): void {
		this.invalidateAll();
	}

	clear(): void {
		this.sessionActive = false;
		this.calls.clear();
		this.runs.clear();
		this.currentRun = this.newRun(++this.runSequence);
		this.settled = false;
	}

	private recordArgs(call: ToolCallRecord, args?: Record<string, unknown>): void {
		if (call.toolName === "read" && typeof args?.path === "string") {
			this.runs.get(call.runID)?.filesRead.add(args.path);
		}
	}

	private invalidateAll(): void {
		for (const call of this.calls.values()) {
			try {
				call.invalidate?.();
			} catch {
				call.invalidate = undefined;
			}
		}
	}
}
