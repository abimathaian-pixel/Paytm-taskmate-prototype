/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@taskmate/shared", "@taskmate/ui"],
  reactStrictMode: true,
};

export default nextConfig;
