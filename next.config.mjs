/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lesson content (content/challenges/**) is authored for the in-browser/Vitest runner,
  // not the app build, so we don't lint it here.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
