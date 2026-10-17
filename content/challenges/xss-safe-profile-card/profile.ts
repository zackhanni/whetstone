/**
 * A public profile, exactly as the profile form saved it. Every field is typed by the user, so
 * every field is attacker-controlled. (Read-only support file — the card lives in ProfileCard.tsx.)
 */
export type Profile = {
  name: string;
  /** Plain text. Users can't format their bio; whatever they type should appear as typed. */
  bio: string;
  /** Whatever the user typed into the "Website" box. */
  website: string;
  avatarUrl: string;
};
