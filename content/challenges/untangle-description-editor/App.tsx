import { DescriptionEditor } from "./DescriptionEditor";

export default function App() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 16 }}>
      <h3>Edit description</h3>
      <p style={{ color: "#64748b", fontSize: 13, marginTop: 0 }}>
        In the buggy version you can&apos;t type, the count never moves, and resizing the
        preview pane bumps the resize counter by more than one.
      </p>
      <DescriptionEditor description="Draft" />
    </div>
  );
}
