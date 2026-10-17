import type { Profile } from "./profile";

/**
 * The URL a website value may link to, or null. Parse first, then allow-list the scheme: the URL
 * parser has already stripped leading spaces and control characters, removed tabs and newlines,
 * and lowercased the scheme, so " JavaScript:" can't slip past the check the way it slips past
 * startsWith. A value that isn't an absolute URL at all makes `new URL` throw.
 */
function linkableWebsite(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
}

export function ProfileCard({ profile }: { profile: Profile }) {
  const href = linkableWebsite(profile.website);

  return (
    <article data-testid="profile-card">
      <span data-testid="avatar">
        {/* JSX attribute values are escaped, so a quote in the name stays inside alt. */}
        <img src={profile.avatarUrl} alt={profile.name} width={48} height={48} />
      </span>
      <h2 data-testid="name">{profile.name}</h2>
      {/* Plain text: let React escape it. */}
      <p data-testid="bio">{profile.bio}</p>
      {href ? (
        <a data-testid="website-link" href={href}>
          {profile.website}
        </a>
      ) : (
        <span data-testid="website-text">{profile.website}</span>
      )}
    </article>
  );
}
