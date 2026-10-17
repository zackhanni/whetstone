import { useEffect, useState } from "react";
import { postSendCode } from "./send-code-api";

export const COOLDOWN_MS = 60_000;

/**
 * Pure: the button label at `now`, given when the last code went out. Everything it depends on
 * is an argument, so a test can pass any instant — including the exact 60 s boundary.
 */
export function resendLabel(now: number, lastSentAt: number): string {
  const remainingMs = COOLDOWN_MS - (now - lastSentAt);
  if (remainingMs <= 0) return "Resend code"; // <= : at exactly 60 s the wait is over
  return `Resend in ${Math.ceil(remainingMs / 1000)}s`; // ceil: 0.5 s left is "1s", never "0s"
}

export type SendResult = { ok: true; sentAt: number } | { ok: false; retryInSeconds: number };

export type CodeSenderDeps = {
  now: () => number;
  send: (email: string) => Promise<void>;
};

/**
 * The clock and the network come in as arguments (the seam), and the cooldown lives in this
 * closure — so every sender, and every test, starts with its own.
 */
export function createCodeSender({ now, send }: CodeSenderDeps) {
  let lastSentAt = -Infinity;

  return async function requestCode(email: string): Promise<SendResult> {
    const at = now();
    const remainingMs = COOLDOWN_MS - (at - lastSentAt);
    if (remainingMs > 0) return { ok: false, retryInSeconds: Math.ceil(remainingMs / 1000) };
    lastSentAt = at; // set before awaiting, so a double click can't send twice
    await send(email);
    return { ok: true, sentAt: at };
  };
}

// The app's one real sender: the real clock and the real API, plugged in at the edge.
const sendWithRealClock = createCodeSender({ now: Date.now, send: postSendCode });

export function ResendButton({
  email,
  requestCode = sendWithRealClock,
}: {
  email: string;
  requestCode?: (email: string) => Promise<SendResult>;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [sentAt, setSentAt] = useState(-Infinity);
  const [message, setMessage] = useState("");

  // The shell owns the clock: it reads the time in an effect and passes it to the pure label.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const onClick = async () => {
    const result = await requestCode(email);
    if (!result.ok) return;
    setSentAt(result.sentAt);
    setNow(result.sentAt);
    setMessage(`Code sent to ${email}`);
  };

  return (
    <div>
      <button type="button" onClick={onClick}>
        {resendLabel(now, sentAt)}
      </button>
      <p>{message}</p>
    </div>
  );
}
