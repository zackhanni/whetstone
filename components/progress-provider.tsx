"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loadAllProgress, recordProgress, type ProgressMap } from "@/lib/progress";

type ProgressContextValue = {
  map: ProgressMap;
  /** False until the first client-side localStorage read has run — gate UI on this to avoid flashes. */
  ready: boolean;
  /**
   * Record engagement with a unit: re-reads the stored map (lib/progress.ts), merges and persists
   * it, and replaces the shared map.
   */
  record: (id: string, answered: number, total: number) => void;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

/**
 * Single source of truth for local-first progress. Reads the whole map from localStorage once
 * after mount (each `record()` re-reads it before writing) and shares it via context, so the
 * dashboard's many progress components don't each run their own effect/read. Lives in the root
 * layout, so the in-memory map survives client navigation — finishing a unit updates the
 * dashboard without re-reading storage.
 *
 * NOTE: This provider is the thing the planned Zustand migration replaces. Its trigger (a 2nd
 * persisted store) has fired: lib/stores/interests-store.ts is on Zustand; progress and drill
 * history are not ported yet. The `record()` API + ProgressMap shape are intentionally
 * store-agnostic so the swap is a container change, not a rewrite. Plan + triggers:
 * docs/zustand-migration.md.
 */
export function ProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ map: ProgressMap; ready: boolean }>({
    map: {},
    ready: false,
  });

  useEffect(() => {
    // The one client-only read: localStorage doesn't exist on the server, so hydrate here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ map: loadAllProgress(), ready: true });
  }, []);

  const record = useCallback((id: string, answered: number, total: number) => {
    setState({ map: recordProgress(id, answered, total), ready: true });
  }, []);

  // Memoize the context value so a re-render of the provider that doesn't change map/ready/record
  // doesn't force every consumer to re-render — the exact Context pitfall the "choosing where
  // state lives" lesson covers.
  const value = useMemo(
    () => ({ map: state.map, ready: state.ready, record }),
    [state.map, state.ready, record],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used within a ProgressProvider");
  return ctx;
}
