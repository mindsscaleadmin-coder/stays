import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/admin/filters",
        destination: "/admin/settings/filters",
        permanent: true,
      },
      {
        source: "/:locale(en|ar)/admin/filters",
        destination: "/:locale/admin/settings/filters",
        permanent: true,
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
    serverActions: {
      bodySizeLimit: "2mb",
    },
    turbo: {
      resolveAlias: {
        "@opentelemetry/api": "./src/lib/otel-stub.ts",
        "@valkey/valkey-glide": "./src/lib/optional-module-stub.ts",
      },
    },
  },
  webpack: (config, { dev }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@valkey/valkey-glide": false,
    };
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/.next/**",
          "**/.data/**",
          "**/agent-transcripts/**",
        ],
      };
    }
    return config;
  },
};

export default withNextIntl(nextConfig);
