import { render, screen, fireEvent, act } from "@testing-library/react";
import { DescriptionEditor } from "./DescriptionEditor";

const setup = () => {
  render(<DescriptionEditor description="Draft" />);
  const input = screen.getByTestId("text") as HTMLInputElement;
  return {
    input,
    type: (value: string) => fireEvent.change(input, { target: { value } }),
    count: () => screen.getByTestId("count").textContent,
    resizes: () => screen.getByTestId("resizes").textContent,
  };
};

const resize = () => {
  act(() => {
    window.dispatchEvent(new Event("resize"));
  });
};

describe("DescriptionEditor", () => {
  it("starts from the description prop", () => {
    const { input } = setup();
    expect(input.value).toBe("Draft");
  });

  it("keeps what the user types", () => {
    const { input, type } = setup();
    type("Draft edit");
    expect(input.value).toBe("Draft edit");
  });

  it("shows a character count that matches the current text", () => {
    const { type, count } = setup();
    type("hello");
    expect(count()).toBe("5");
  });

  it("counts two resize events as exactly two", () => {
    const { resizes } = setup();
    resize();
    resize();
    expect(resizes()).toBe("2");
  });

  // No spy library in this sandbox, so track the listeners by hand. Counting calls isn't
  // enough: cleanup has to remove *the same function* it added, so we match on identity.
  it("removes every resize listener it added when it unmounts", () => {
    const add = window.addEventListener;
    const remove = window.removeEventListener;
    const live = new Set<unknown>();

    window.addEventListener = function patched(type: string, listener: unknown, ...rest: unknown[]) {
      if (type === "resize") live.add(listener);
      return (add as (...a: unknown[]) => void).call(window, type, listener, ...rest);
    } as typeof window.addEventListener;

    window.removeEventListener = function patched(type: string, listener: unknown, ...rest: unknown[]) {
      if (type === "resize") live.delete(listener);
      return (remove as (...a: unknown[]) => void).call(window, type, listener, ...rest);
    } as typeof window.removeEventListener;

    try {
      const view = render(<DescriptionEditor description="Draft" />);
      expect(live.size).toBe(1);
      view.unmount();
      expect(live.size).toBe(0);
    } finally {
      window.addEventListener = add;
      window.removeEventListener = remove;
    }
  });
});
