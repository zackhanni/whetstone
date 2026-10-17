import { render, screen, fireEvent, act } from "@testing-library/react";
import { Counter } from "./Counter";
import { SAVE_DELAY_MS } from "./api";

const waitForSaves = () =>
  act(() => new Promise<void>((resolve) => setTimeout(resolve, SAVE_DELAY_MS * 3)));

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

  it("counts both of two quick 'Save +1' clicks", async () => {
    render(<Counter />);
    const button = screen.getByText("Save +1");
    fireEvent.click(button);
    fireEvent.click(button); // before the first save has come back
    await waitForSaves();
    expect(screen.getByTestId("count").textContent).toBe("2");
  });
});
