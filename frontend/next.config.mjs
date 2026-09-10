/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NEXT_DISABLE_STANDALONE ? undefined : "standalone",
  reactStrictMode: true,
  // A custom directory is useful for isolated CI verification.
  distDir: process.env.NEXT_DIST_DIR || ".next"
};

export default nextConfig;
