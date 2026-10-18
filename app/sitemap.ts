import type { MetadataRoute } from "next";
import { listTrackSlugs, listUnits } from "@/lib/content";
import { SITE_URL } from "@/lib/seo";

// Every page is public and indexable: the home page, each track and each unit.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tracks, units] = await Promise.all([listTrackSlugs(), listUnits()]);
  const paths = ["/", ...tracks.map((t) => `/learn/${t}`), ...units.map((u) => `/learn/${u.track}/${u.unit}`)];
  return paths.map((path) => ({ url: new URL(path, SITE_URL).toString() }));
}
