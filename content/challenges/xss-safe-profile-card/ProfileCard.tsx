import type { Profile } from "./profile";

/**
 * Renders a user's public profile. It looks fine with friendly data — and runs an attacker's
 * script with hostile data. Three bugs, in the order worth fixing them:
 *   1. bio — plain text is being rendered as HTML.
 *   2. avatar — the <img> is built by gluing user strings into an HTML template.
 *   3. website — a deny-list decides what becomes a link; only absolute http(s) URLs should.
 */
export function ProfileCard({ profile }: { profile: Profile }) {
  const avatarHtml = `<img src="${profile.avatarUrl}" alt="${profile.name}" width="48" height="48">`;
  const isLink = !profile.website.startsWith("javascript:");

  return (
    <article data-testid="profile-card">
      <span data-testid="avatar" dangerouslySetInnerHTML={{ __html: avatarHtml }} />
      <h2 data-testid="name">{profile.name}</h2>
      <p data-testid="bio" dangerouslySetInnerHTML={{ __html: profile.bio }} />
      {isLink ? (
        <a data-testid="website-link" href={profile.website}>
          {profile.website}
        </a>
      ) : (
        <span data-testid="website-text">{profile.website}</span>
      )}
    </article>
  );
}
