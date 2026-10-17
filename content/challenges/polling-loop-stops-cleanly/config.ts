// Shared by the poller's tests so the interval can't drift between them.
// (Short on purpose so the suite stays fast: a real poller would use seconds.)
export const INTERVAL_MS = 30;
