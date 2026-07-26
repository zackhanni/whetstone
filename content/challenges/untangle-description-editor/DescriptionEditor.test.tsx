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

  // No spy library in this sandbox, so count the calls by hand.
  it("removes the resize listener when it unmounts", () => {
    const original = window.removeEventListener;
    let removedResize = 0;
    window.removeEventListener = function patched(type: string, ...rest: unknown[]) {
      if (type === "resize") removedResize += 1;
      return (original as (...a: unknown[]) => void).call(window, type, ...rest);
    } as typeof window.removeEventListener;

    try {
      const view = render(<DescriptionEditor description="Draft" />);
      view.unmount();
    } finally {
      window.removeEventListener = original;
    }

    expect(removedResize > 0).toBe(true);
  });
});
