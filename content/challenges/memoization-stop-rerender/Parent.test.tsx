import { render, screen, fireEvent } from "@testing-library/react";
import { Parent } from "./Parent";

describe("Parent / memo Child", () => {
  it("renders the child exactly once on mount", () => {
    render(<Parent />);
    expect(screen.getByTestId("child-renders").textContent).toBe("1");
  });

  it("does NOT re-render the memo child when only the parent's tick changes", () => {
    render(<Parent />);
    const tick = screen.getByText("Tick");
    fireEvent.click(tick);
    fireEvent.click(tick);
    fireEvent.click(tick);

    // The parent state changed three times, but the child's props are unchanged,
    // so a properly memoized child should not have re-rendered.
    expect(screen.getByTestId("ticks").textContent).toBe("ticks: 3");
    expect(screen.getByTestId("child-renders").textContent).toBe("1");
  });

  it("still fires the child's callback when its own button is clicked", () => {
    render(<Parent />);
    fireEvent.click(screen.getByText("Child action"));
    expect(screen.getByTestId("last-clicked").textContent).toBe("last clicked: child");
  });
});
