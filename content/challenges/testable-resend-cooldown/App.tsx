import { ResendButton } from "./ResendButton";

export default function App() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 16 }}>
      <h3>Check your email</h3>
      <p style={{ color: "#64748b", fontSize: 13, marginTop: 0 }}>
        We sent a sign-in code to ada@example.com. Click to resend, then watch the countdown —
        the tests check the edge cases you'd have to wait a minute to see here.
      </p>
      <ResendButton email="ada@example.com" />
    </div>
  );
}
