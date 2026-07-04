import { render, screen } from "@testing-library/react";
import { SearchForm } from "./SearchForm";

describe("SearchForm", () => {
  it("renders the search input", () => {
    render(<SearchForm />);
    const input = screen.getByTestId("search");
    expect(input.tagName).toBe("INPUT");
    expect(input.getAttribute("placeholder")).toBe("Search…");
  });

  it("focuses the input on mount", () => {
    render(<SearchForm />);
    const input = screen.getByTestId("search");
    expect(document.activeElement === input).toBe(true);
  });
});
