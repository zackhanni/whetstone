// Security headers for every route. The audit behind them: docs/security-audit.md.
//
// The CSP allows inline scripts and styles because every page is prerendered: Next's inline
// bootstrap scripts are baked in at build time, so a per-request nonce would force every route
// to render dynamically. Nothing renders untrusted HTML here (lessons are Markdown from the repo,
// rendered without raw HTML), so the policy's job is to pin where code, frames and requests can
// come from. Sandpack runs challenges in cross-origin iframes on *.codesandbox.io.
//
// Production builds only: `next dev` uses eval for fast refresh, which this policy blocks. Check a
// change here with `pnpm build && pnpm exec next start -p 3418` (another app owns :3000), not the
// dev server.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src https://*.codesandbox.io",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    if (process.env.NODE_ENV !== "production") return [];
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
