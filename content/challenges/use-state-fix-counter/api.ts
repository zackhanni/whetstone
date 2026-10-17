// A pretend server call, shared by the component and its tests so the delay can't drift
// between them. (Provided; you don't need to edit this file.)
export const SAVE_DELAY_MS = 50;

export function save(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, SAVE_DELAY_MS));
}
