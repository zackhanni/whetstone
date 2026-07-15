import { createContext, useContext } from "react";

// Shared context module (support file — do NOT edit). The fix lives in Settings.tsx.
export type Theme = "light" | "dark";
export type ThemeValue = { theme: Theme; toggleTheme: () => void };

export const ThemeContext = createContext<ThemeValue | null>(null);

export function useThemeContext(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useThemeContext must be used within a ThemeContext.Provider");
  return value;
}
