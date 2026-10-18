import { ImageResponse } from "next/og";
import { listTrackSlugs, listUnits } from "@/lib/content";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

// The site's link-preview card, generated at build time from the catalog so the counts can't
// drift. next/og bundles one font weight (Geist Regular), so the hierarchy comes from size.
export const alt = `${SITE_NAME}: lessons, drills and in-browser coding challenges`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const [tracks, units] = await Promise.all([listTrackSlugs(), listUnits()]);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 32,
          padding: 80,
          background: "#020617",
          color: "#f1f5f9",
        }}
      >
        <div style={{ display: "flex", width: 120, height: 8, background: "#38bdf8", borderRadius: 4 }} />
        <div style={{ fontSize: 96, letterSpacing: -2 }}>{SITE_NAME}</div>
        <div style={{ fontSize: 34, lineHeight: 1.35, color: "#cbd5e1", maxWidth: 1000 }}>
          {SITE_DESCRIPTION}
        </div>
        <div style={{ fontSize: 28, color: "#38bdf8" }}>
          {`${tracks.length} tracks · ${units.length} units`}
        </div>
      </div>
    ),
    size,
  );
}
