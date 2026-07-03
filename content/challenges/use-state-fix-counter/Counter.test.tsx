import { render, screen, fireEvent } from "@testing-library/react";
import { Counter } from "./Counter";

describe("Counter", () => {
  it("starts at 0", () => {
    render(<Counter />);
    expect(screen.getByTestId("count").textContent).toBe("0");
  });

  it("adds 3 when 'Add 3' is clicked", () => {
    render(<Counter />);
    fireEvent.click(screen.getByText("Add 3"));
    expect(screen.getByTestId("count").textContent).toBe("3");
  });

  it("reaches 6 after two clicks", () => {
    render(<Counter />);
    const button = screen.getByText("Add 3");
    fireEvent.click(button);
    fireEvent.click(button);
    expect(screen.getByTestId("count").textContent).toBe("6");
  });
});
