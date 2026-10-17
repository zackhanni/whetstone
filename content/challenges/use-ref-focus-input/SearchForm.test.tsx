import { render, screen, fireEvent } from "@testing-library/react";
import { SearchForm } from "./SearchForm";

// A real mouse click focuses the button before its onClick runs; fireEvent.click doesn't
// move focus, so each test focuses the button by hand first. That also means an input that
// was only focused on mount (`autoFocus`) has lost focus by the time Clear is clicked.
const clickLikeAUser = (button: HTMLElement) => {
  button.focus();
  fireEvent.click(button);
};

describe("SearchForm", () => {
  it("renders the search input", () => {
    render(<SearchForm />);
    const input = screen.getByTestId("search");
    expect(input.tagName).toBe("INPUT");
    expect(input.getAttribute("placeholder")).toBe("Search…");
  });

  it("keeps what the user types", () => {
    render(<SearchForm />);
    const input = screen.getByTestId("search") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "react" } });
    expect(input.value).toBe("react");
  });

  it("empties the input when Clear is clicked", () => {
    render(<SearchForm />);
    const input = screen.getByTestId("search") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "react" } });
    clickLikeAUser(screen.getByText("Clear"));
    expect(input.value).toBe("");
  });

  it("moves focus back into the input when Clear is clicked", () => {
    render(<SearchForm />);
    const input = screen.getByTestId("search");
    const clear = screen.getByText("Clear");
    fireEvent.change(input, { target: { value: "react" } });
    clickLikeAUser(clear);
    expect(document.activeElement === input).toBe(true);
  });

  it("moves focus back into the input even when the box was already empty", () => {
    render(<SearchForm />);
    const input = screen.getByTestId("search");
    // Clear on an empty box sets the same state, so React bails out and no effect re-runs:
    // an effect that focuses "whenever the query becomes empty" (or after every render)
    // never fires here. The focus belongs to the click itself.
    clickLikeAUser(screen.getByText("Clear"));
    expect(document.activeElement === input).toBe(true);
  });

  it("focuses its own input when two forms are on the page", () => {
    render(
      <>
        <SearchForm />
        <SearchForm />
      </>,
    );
    const inputs = screen.getAllByTestId("search");
    const clears = screen.getAllByText("Clear");
    // A document-wide lookup (querySelector, getElementById) finds the FIRST form's input;
    // a ref points at this component's own node.
    clickLikeAUser(clears[1]);
    expect(document.activeElement === inputs[1]).toBe(true);
    clickLikeAUser(clears[0]);
    expect(document.activeElement === inputs[0]).toBe(true);
  });
});
