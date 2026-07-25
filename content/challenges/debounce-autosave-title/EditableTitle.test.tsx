import { render, screen, fireEvent, act } from "@testing-library/react";
import { EditableTitle } from "./EditableTitle";
import { SAVE_DELAY_MS } from "./config";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const settle = async () => {
  await act(async () => {
    await wait(SAVE_DELAY_MS * 2 + 50);
  });
};

const setup = () => {
  const calls: string[] = [];
  const view = render(<EditableTitle title="Untitled" onCommit={(t) => calls.push(t)} />);
  const input = screen.getByTestId("title") as HTMLInputElement;
  const type = (value: string) => fireEvent.change(input, { target: { value } });
  return { calls, input, type, unmount: view.unmount };
};

describe("EditableTitle", () => {
  it("keeps the input responsive on every keystroke", () => {
    const { input, type } = setup();
    type("H");
    type("He");
    expect(input.value).toBe("He");
  });

  it("does not commit while the user is still typing", () => {
    const { calls, type } = setup();
    type("H");
    type("He");
    type("Hel");
    expect(calls.length).toBe(0);
  });

  it("commits once, with the final value, after typing stops", async () => {
    const { calls, type } = setup();
    type("H");
    type("He");
    type("Hello");
    await settle();
    expect(calls.length).toBe(1);
    expect(calls[0]).toBe("Hello");
  });

  it("commits immediately on blur, and only once", async () => {
    const { calls, input, type } = setup();
    type("Renamed");
    fireEvent.blur(input);
    expect(calls.length).toBe(1);
    expect(calls[0]).toBe("Renamed");
    await settle();
    expect(calls.length).toBe(1);
  });

  it("commits nothing when the field is blurred without an edit", async () => {
    const { calls, input } = setup();
    fireEvent.blur(input);
    await settle();
    expect(calls.length).toBe(0);
  });

  it("cancels a pending commit when the component unmounts", async () => {
    const { calls, type, unmount } = setup();
    type("Gone");
    unmount();
    await settle();
    expect(calls.length).toBe(0);
  });
});
