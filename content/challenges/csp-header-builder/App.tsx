import { cspForRequest } from "./csp";
import { parseCsp } from "./csp-parse";

const base = {
  scriptOrigins: ["https://js.stripe.com"],
  connectOrigins: ["https://api.stripe.com"],
  reportTo: "csp-endpoint",
};

const requests = [
  { label: "production request #1", result: cspForRequest({ ...base, dev: false }) },
  { label: "production request #2", result: cspForRequest({ ...base, dev: false }) },
  { label: "development request", result: cspForRequest({ ...base, dev: true }) },
];

export default function App() {
  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, padding: 12 }}>
      {requests.map(({ label, result }) => (
        <div key={label} style={{ marginBottom: 16 }}>
          <h3 style={{ fontFamily: "system-ui, sans-serif", margin: "0 0 4px" }}>{label}</h3>
          <div style={{ color: "#64748b" }}>nonce: {result.nonce}</div>
          <table style={{ borderCollapse: "collapse" }}>
            <tbody>
              {Object.entries(parseCsp(result.header)).map(([name, values]) => (
                <tr key={name}>
                  <td style={{ paddingRight: 12, verticalAlign: "top" }}>{name}</td>
                  <td>{values.join(" ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
