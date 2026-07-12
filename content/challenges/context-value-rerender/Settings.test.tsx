import { render, screen, fireEvent } from "@testing-library/react";
import { Settings } from "./Settings";

describe("Settings / theme context value", () => {
  it("renders the context consumer exactly once on mount", () => {
    render(<Settings />);
    expect(screen.getByTestId("label-renders").textContent).toBe("1");
  });

  it("does NOT re-render the memo'd consumer on an unrelated tick", () => {
    render(<Settings />);
    const tick = screen.getByText("Tick");
    fireEvent.click(tick);
    fireEvent.click(tick);
    fireEvent.click(tick);

    // Settings re-rendered three times, but the theme never changed — a stable context value
    // should leave the memo'd consumer untouched.
    expect(screen.getByTestId("ticks").textContent).toBe("ticks: 3");
    expect(screen.getByTestId("label-renders").textContent).toBe("1");
  });

  it("still updates the consumer when the theme actually changes", () => {
    render(<Settings />);
    expect(screen.getByTestId("theme").textContent).toBe("light");
    fireEvent.click(screen.getByText("Toggle theme"));
    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });
});
