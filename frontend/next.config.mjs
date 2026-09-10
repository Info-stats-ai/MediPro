/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  // A custom directory is useful for isolated CI verification.
  distDir: process.env.NEXT_DIST_DIR || ".next"
};

export default nextConfig;
