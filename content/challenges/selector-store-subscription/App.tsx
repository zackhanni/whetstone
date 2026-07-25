import { CountLabel } from "./CountLabel";
import { OtherLabel } from "./OtherLabel";

export default function App() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 16 }}>
      <h3>Two components, one store</h3>
      <p style={{ color: "#64748b", fontSize: 13, marginTop: 0 }}>
        Click “count +1” and watch the render counters. With a whole-store subscription both
        climb; with selector subscriptions only the one that changed does.
      </p>
      <CountLabel />
      <OtherLabel />
    </div>
  );
}
