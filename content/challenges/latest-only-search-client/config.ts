// A search that takes longer than this fails with "Search timed out". Shared with the tests.
// (Short on purpose so the suite stays fast: a real client would allow a few seconds.)
export const TIMEOUT_MS = 50;
