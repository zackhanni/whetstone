import { useState } from "react";
import { ThemeContext, type Theme } from "./theme-context";
import { ThemeLabel } from "./ThemeLabel";

export function Settings() {
  const [theme, setTheme] = useState<Theme>("light");
  const [ticks, setTicks] = useState(0);

  // 🐛 BUG: `value` is a brand-new object on every Settings render, and `toggleTheme` is a
  // brand-new function too. React Context compares its value by identity, so EVERY consumer
  // re-renders whenever Settings renders — even on an unrelated "Tick" that never touches the
  // theme. The memo() on <ThemeLabel> can't help: the change arrives through context.
  // Give the value a stable identity so consumers re-render only when the theme changes.
  function toggleTheme() {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }
  const value = { theme, toggleTheme };

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
