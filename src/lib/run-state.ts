// In-memory pause flags — fine for single-process Next.js server
const pauseFlags = new Map<number, boolean>();
export function setPause(runId: number, paused: boolean) { pauseFlags.set(runId, paused); }
export function isPaused(runId: number) { return pauseFlags.get(runId) ?? false; }
export function clearPause(runId: number) { pauseFlags.delete(runId); }
