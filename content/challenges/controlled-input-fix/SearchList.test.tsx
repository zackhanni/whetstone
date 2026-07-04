import { render, screen, fireEvent } from "@testing-library/react";
import { SearchList } from "./SearchList";

describe("SearchList", () => {
  it("shows all items initially", () => {
    render(<SearchList />);
    expect(screen.getByTestId("list").querySelectorAll("li").length).toBe(6);
  });

  it("updates the input value as the user types", () => {
    render(<SearchList />);
    const input = screen.getByTestId("search") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "ban" } });
    expect(input.value).toBe("ban");
  });

  it("filters the list to matching items (case-insensitive)", () => {
    render(<SearchList />);
    const input = screen.getByTestId("search") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "ap" } });
    const items = Array.from(
      screen.getByTestId("list").querySelectorAll("li")
    ).map((li) => li.textContent);
    expect(items).toEqual(["Apple", "Apricot"]);
  });

  it("shows all items again when the box is cleared", () => {
    render(<SearchList />);
    const input = screen.getByTestId("search") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "cherry" } });
    expect(screen.getByTestId("list").querySelectorAll("li").length).toBe(1);
    fireEvent.change(input, { target: { value: "" } });
    expect(screen.getByTestId("list").querySelectorAll("li").length).toBe(6);
  });
});
