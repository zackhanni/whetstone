"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * `false` on the server and on the client's hydration render, `true` thereafter. The SSR-safe gate
 * for reading persisted client state (localStorage/Zustand): render the neutral/default view first
 * so the client's initial HTML matches the server's, then read the persisted value.
 *
 * Uses `useSyncExternalStore` (server snapshot `false`, client snapshot `true`) rather than a
 * `useState` + `useEffect(setState)` flip — same result without a synchronous set-state in an effect.
 */
export function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
