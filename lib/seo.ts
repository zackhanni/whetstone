import type { Metadata } from "next";

/**
 * Search and link-preview metadata: the site's one address, the per-page metadata every route
 * builds, and the JSON-LD objects. The audit behind it: docs/seo.md.
 */

/** The production address; canonicals, the sitemap and robots.txt all name it. */
export const SITE_URL = "https://whetstone-tawny.vercel.app";
export const SITE_NAME = "Whetstone";
export const SITE_DESCRIPTION =
  "Lessons, drills and in-browser coding challenges for the skills senior web engineers use: React, TypeScript, HTTP, Next.js, databases, testing and security.";

/** The generated site card (app/opengraph-image.tsx). */
const OG_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: "Whetstone" };

const DESCRIPTION_MAX = 155;

/** Inline Markdown in content fields (`code`, **bold**) as the plain text a meta tag needs. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Shortens text to fit a meta description: whole sentences when they fit, else whole words and
 * an ellipsis. Search results cut descriptions at about 155 characters anyway; cutting here
 * keeps the cut between words.
 */
export function clipDescription(text: string, max = DESCRIPTION_MAX): string {
  if (text.length <= max) return text;
  // The last sentence end that fits: ". " (or "!"/"?"), so "Next.js" and "1.4" don't count.
  // Below 60 characters a sentence cut says too little; cut at a word instead.
  let sentenceEnd = -1;
  for (let i = 0; i < max; i++) {
    if (".!?".includes(text[i]) && text[i + 1] === " ") sentenceEnd = i;
  }
  if (sentenceEnd >= 60) return text.slice(0, sentenceEnd + 1);
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

/**
 * One page's metadata. `path` is required so no page ships without a canonical. A page that
 * sets `openGraph` replaces the layout's whole object (Next merges metadata shallowly), so the
 * image and site name are repeated here rather than left to the layout.
 */
export function pageMetadata({
  title,
  description,
  path,
}: {
  /** The page's own title; the layout's template adds " · Whetstone". Omit on the home page. */
  title?: string;
  description: string;
  path: string;
}): Metadata {
  const fullTitle = title ? `${title} · ${SITE_NAME}` : SITE_NAME;
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_US",
      title: fullTitle,
      description,
      url: path,
      images: [OG_IMAGE],
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [OG_IMAGE.url] },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
  };
}

/** Whetstone › track › (unit), as absolute URLs. */
export function breadcrumbJsonLd(crumbs: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: SITE_NAME, path: "/" }, ...crumbs].map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: new URL(crumb.path, SITE_URL).toString(),
    })),
  };
}
