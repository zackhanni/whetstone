import { render, screen, fireEvent } from "@testing-library/react";
import { CountLabel } from "./CountLabel";
import { OtherLabel } from "./OtherLabel";
import { store } from "./counter-store";

const setup = () => {
  store.reset(); // the store is a module-level singleton — reset between cases
  const view = render(
    <>
      <CountLabel />
      <OtherLabel />
    </>,
  );
  return {
    unmount: view.unmount,
    count: () => screen.getByTestId("count").textContent,
    other: () => screen.getByTestId("other").textContent,
    countRenders: () => screen.getByTestId("count-renders").textContent,
    otherRenders: () => screen.getByTestId("other-renders").textContent,
    inc: () => fireEvent.click(screen.getByTestId("inc")),
    bump: () => fireEvent.click(screen.getByTestId("bump")),
  };
};

describe("useStore", () => {
  it("reads the current state through the selector", () => {
    const view = setup();
    expect(view.count()).toBe("0");
    expect(view.other()).toBe("0");
  });

  it("re-renders the component whose slice changed", () => {
    const view = setup();
    view.inc();
    expect(view.count()).toBe("1");
    expect(view.countRenders()).toBe("2");
  });

  it("does NOT re-render a component whose slice did not change", () => {
    const view = setup();
    view.inc();
    view.inc();
    expect(view.count()).toBe("2");
    expect(view.otherRenders()).toBe("1");
  });

  it("drops its subscription when the component unmounts", () => {
    const view = setup();
    expect(store.listenerCount() > 0).toBe(true);
    view.unmount();
    expect(store.listenerCount()).toBe(0);
  });

  it("still updates the other component when its own slice changes", () => {
    const view = setup();
    view.bump();
    expect(view.other()).toBe("1");
    expect(view.otherRenders()).toBe("2");
    expect(view.countRenders()).toBe("1");
  });
});
