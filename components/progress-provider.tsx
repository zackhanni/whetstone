"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { loadAllProgress, recordProgress, type ProgressMap } from "@/lib/progress";

type ProgressContextValue = {
  map: ProgressMap;
  /** False until the one client-side localStorage read has run — gate UI on this to avoid flashes. */
  ready: boolean;
  /** Record engagement with a unit; persists and updates the shared map in place. */
  record: (id: string, answered: number, total: number) => void;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

/**
 * Single source of truth for local-first progress. Reads the whole map ONCE from localStorage
 * after mount and shares it via context, so the dashboard's many progress components don't each
 * run their own effect/read. Lives in the root layout, so the in-memory map survives client
 * navigation — finishing a unit updates the dashboard without re-reading storage.
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

  return (
    <ProgressContext.Provider value={{ map: state.map, ready: state.ready, record }}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used within a ProgressProvider");
  return ctx;
}
