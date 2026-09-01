/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Vercel-unified: all routes server-rendered via API + Prisma (ensure no caching of auth data)
  headers: async () => [
    {
      source: "/api/:path*",
      headers: [
        { key: "Cache-Control", value: "no-store, must-revalidate" },
      ],
    },
  ],
  // Prisma needs to be externalized for serverless
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

module.exports = nextConfig;
