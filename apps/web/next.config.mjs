/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@taskmate/shared", "@taskmate/ui"],
  reactStrictMode: true,
  async rewrites() {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      "https://paytm-taskmate-prototype-api.vercel.app";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
