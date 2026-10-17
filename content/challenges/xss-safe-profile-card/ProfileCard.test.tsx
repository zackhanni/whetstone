import { render, screen } from "@testing-library/react";
import { ProfileCard } from "./ProfileCard";
import type { Profile } from "./profile";

const friendly: Profile = {
  name: "Ann Lee",
  bio: "Builds accessible forms.",
  website: "https://ann.dev/work",
  avatarUrl: "/avatars/ann.png",
};

const renderCard = (overrides: Partial<Profile>) =>
  render(<ProfileCard profile={{ ...friendly, ...overrides }} />);

describe("ProfileCard", () => {
  it("shows markup in the bio as text instead of creating elements", () => {
    const bio = 'Hi <b>there</b> <img src="x" onerror="window.__xssRan = true">';
    renderCard({ bio });
    const el = screen.getByTestId("bio");
    expect(el.children.length).toBe(0);
    expect(el.textContent).toBe(bio);
  });

  it("keeps a quote in the name or avatar URL inside the avatar's own attributes", () => {
    const name = 'Ann" onerror="window.__xssRan = true';
    const avatarUrl = '/avatars/ann.png" onload="window.__xssRan = true';
    renderCard({ name, avatarUrl });
    const imgs = screen.getByTestId("avatar").querySelectorAll("img");
    expect(imgs.length).toBe(1);
    expect(imgs[0].getAttribute("onerror")).toBeNull();
    expect(imgs[0].getAttribute("onload")).toBeNull();
    expect(imgs[0].getAttribute("alt")).toBe(name);
    expect(imgs[0].getAttribute("src")).toBe(avatarUrl);
  });

  it("shows a website that isn't an absolute http(s) URL as text, never as a link", () => {
    const unsafe = [
      "JavaScript:alert(1)",
      "  javascript:alert(1)",
      // The URL parser removes tabs and newlines anywhere, so this is the javascript: scheme too.
      "java\tscript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      // Not an absolute URL at all: a deny-list would link it as a relative path.
      "ann.dev",
    ];
    for (const website of unsafe) {
      const { unmount } = renderCard({ website });
      expect(screen.queryByTestId("website-link")).toBeNull();
      expect(screen.getByTestId("website-text").textContent).toBe(website);
      unmount();
    }
  });

  it("still links an http or https website to that URL", () => {
    for (const website of ["https://ann.dev/work", "http://example.com/"]) {
      const { unmount } = renderCard({ website });
      expect(screen.getByTestId("website-link").getAttribute("href")).toBe(website);
      unmount();
    }
  });
});
