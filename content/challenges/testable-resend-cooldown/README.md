`ResendButton` lets a user ask for another sign-in code, at most once a minute. QA reports that
the label sometimes reads **"Resend in 0s"**. You can't write a test that reproduces it:

- the label is computed inside the component from `Date.now()`, so a test would have to wait
  a real minute (or fake the clock) and then read it out of the DOM;
- the cooldown lives in a module-level `lastSentAt`, so one test's send blocks the next test;
- sending calls the network module directly, so a test can't see what was sent without mocking
  a module.

Refactor so the rules can be tested with plain values, then let the tests find the bugs. The
grader imports two new exports from `ResendButton.tsx`:

```ts
resendLabel(now: number, lastSentAt: number): string
// "Resend code" once the 60 s cooldown is over, otherwise "Resend in 42s"

createCodeSender({ now, send }): (email: string) => Promise<SendResult>
// SendResult = { ok: true; sentAt: number } | { ok: false; retryInSeconds: number }
// if `send` throws, the promise rejects with that error: no code went out
```

`now` is a function returning epoch milliseconds (production passes `Date.now`); `send` delivers
the code (production passes `postSendCode`). Keep the component working — it becomes the thin
shell that reads the real clock and passes it in.

## Hints

- Once `resendLabel` takes `now` as an argument, try it at exactly `lastSentAt + 60_000` and at
  `lastSentAt + 59_500`. Each bug is a one-token fix.
- `let lastSentAt` inside the factory function, not at the top of the module, gives every sender
  its own cooldown.
- Record the send *before* awaiting the network, so a double click can't slip a second send
  through the gap. If the network then fails, no code went out: the record shouldn't stand.
