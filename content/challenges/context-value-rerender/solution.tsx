import { useCallback, useMemo, useState } from "react";
import { ThemeContext, type Theme } from "./theme-context";
import { ThemeLabel } from "./ThemeLabel";

export function Settings() {
  const [theme, setTheme] = useState<Theme>("light");
  const [ticks, setTicks] = useState(0);

  // ✅ FIX: stabilize the callback (useCallback) and memoize the context value (useMemo) so its
  // identity only changes when `theme` changes. Now an unrelated "Tick" re-renders Settings but
  // NOT the memo'd consumer, because the context value is referentially equal across ticks.
  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }, []);
  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      <div>
        <p data-testid="ticks">ticks: {ticks}</p>
        <button onClick={() => setTicks((t) => t + 1)}>Tick</button>
        <button onClick={toggleTheme}>Toggle theme</button>
        <ThemeLabel />
      </div>
    </ThemeContext.Provider>
  );
}
