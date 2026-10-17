import { ProfileCard } from "./ProfileCard";
import type { Profile } from "./profile";

const avatar =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'><circle cx='24' cy='24' r='24' fill='%2394a3b8'/></svg>";

const friendly: Profile = {
  name: "Ann Lee",
  bio: "Builds accessible forms. Thinks <div> soup is a smell.",
  website: "https://ann.dev/work",
  avatarUrl: avatar,
};

// Each payload only changes the page, so you can see it run in the preview.
const hostile: Profile = {
  name: `Mallory" onerror="this.closest('article').style.outline='4px solid crimson'`,
  bio: `Hi! <img src="x" onerror="this.replaceWith('⚠ a script from the bio just ran')">`,
  website: " JavaScript:alert('pwned')",
  avatarUrl: "/no-such-avatar.png",
};

export default function App() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 16, display: "grid", gap: 16 }}>
      <ProfileCard profile={friendly} />
      <ProfileCard profile={hostile} />
    </div>
  );
}
