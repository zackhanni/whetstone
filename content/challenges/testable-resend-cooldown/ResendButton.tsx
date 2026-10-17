import { useEffect, useState } from "react";
import { postSendCode } from "./send-code-api";

/**
 * The "Resend code" button on a check-your-email screen. QA reports it sometimes says
 * "Resend in 0s". Nobody can write a test for that: the rule is buried in the component, it
 * reads the real clock, and the cooldown lives in a module-level variable.
 *
 * Make it testable, in this order (the tests import the two new exports):
 *   1. extract and export `resendLabel(now, lastSentAt)` — pure — and render with it
 *   2. fix the boundary: once a full 60 s have passed, the label is "Resend code"
 *   3. fix the rounding: the label never says "Resend in 0s"
 *   4. extract and export `createCodeSender({ now, send })`, where each sender keeps its own
 *      cooldown, and have the button use one
 */

const COOLDOWN_MS = 60_000;
let lastSentAt = -Infinity; // shared by every button on the page — and by every test

export function ResendButton({ email }: { email: string }) {
  const [, setTick] = useState(0);
  const [message, setMessage] = useState("");

  // Re-render once a second so the countdown moves.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = Date.now() - lastSentAt;
  const label =
    elapsed > COOLDOWN_MS
      ? "Resend code"
      : `Resend in ${Math.floor((COOLDOWN_MS - elapsed) / 1000)}s`;

  const onClick = async () => {
    const now = Date.now();
    if (now - lastSentAt < COOLDOWN_MS) return;
    lastSentAt = now;
    await postSendCode(email);
    setMessage(`Code sent to ${email}`);
  };

  return (
    <div>
      <button type="button" onClick={onClick}>
        {label}
      </button>
      <p>{message}</p>
    </div>
  );
}
