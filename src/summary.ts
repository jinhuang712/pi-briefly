/**
 * Per-tool-call timing only. Turn-level timing (the live `Working...` indicator
 * and the final `Took` line) belongs to the companion `pi-elapsed` extension and
 * is deliberately absent here.
 */

export function formatCallDuration(milliseconds: number): string {
	const value = Math.max(0, milliseconds);
	if (value < 10_000) return `${(value / 1000).toFixed(1)}s`;
	const totalSeconds = Math.round(value / 1000);
	if (totalSeconds < 60) return `${totalSeconds}s`;
	const minutes = Math.floor(totalSeconds / 60);
	if (minutes < 60) return `${minutes}m ${String(totalSeconds % 60).padStart(2, "0")}s`;
	return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}
