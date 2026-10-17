/**
 * The shapes the CORS layer works with. Header names are lowercase on the way in and on the way
 * out, as HTTP/2 sends them (names are case-insensitive in HTTP anyway).
 *
 * Read-only support file — the logic lives in cors.ts.
 */
export type CorsConfig = {
  /** Full origins: scheme, host and (non-default) port, no trailing slash. */
  allowedOrigins: string[];
  /** The web app sends cookies, so responses must be shareable with credentials. */
  allowCredentials: boolean;
  allowedMethods: string[]; // e.g. ["GET", "POST", "PUT", "DELETE"]
  allowedHeaders: string[]; // lowercase, e.g. ["authorization", "content-type"]
  maxAgeSeconds: number;
};

export type IncomingRequest = {
  method: string;
  headers: Record<string, string | undefined>; // lowercase names: "origin", "access-control-request-method", …
};

export type CorsDecision =
  /** A preflight: answer it now with this status and these headers, and don't run the route. */
  | { kind: "preflight"; status: 204 | 403; headers: Record<string, string> }
  /** A real request: run the route, and add these headers to whatever it returns. */
  | { kind: "pass"; headers: Record<string, string> };

/** The API's real configuration — used by the preview. */
export const apiConfig: CorsConfig = {
  allowedOrigins: ["https://app.example.com", "https://admin.example.com"],
  allowCredentials: true,
  allowedMethods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["authorization", "content-type"],
  maxAgeSeconds: 600,
};
