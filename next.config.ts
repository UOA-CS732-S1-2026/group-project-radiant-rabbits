import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  async redirects() {
    return [{ source: "/landing-page", destination: "/", permanent: true }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/dashboard",
        headers: [
          {
            key: "Cache-Control",
            value: "private, max-age=60, stale-while-revalidate=120",
          },
        ],
      },
      {
        source: "/current-sprint",
        headers: [
          {
            key: "Cache-Control",
            value: "private, max-age=60, stale-while-revalidate=120",
          },
        ],
      },
      {
        source: "/past-sprints",
        headers: [
          {
            key: "Cache-Control",
            value: "private, max-age=300, stale-while-revalidate=600",
          },
        ],
      },
      {
        source: "/teammates",
        headers: [
          {
            key: "Cache-Control",
            value: "private, max-age=60, stale-while-revalidate=120",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
