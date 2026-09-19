import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isProd = process.env.NODE_ENV === "production";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async headers() {
    const securityHeaders = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https: http:",
          "font-src 'self' data:",
          "connect-src 'self' https: wss:",
          "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
        ].join("; "),
      },
    ];

    if (isProd) {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }

    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      {
        source: "/admin/filters",
        destination: "/admin/settings/filters",
        permanent: true,
      },
      {
        source: "/:locale(en)/admin/filters",
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
  turbopack: {
    resolveAlias: {
      "@valkey/valkey-glide": "./src/lib/optional-module-stub.ts",
    },
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
    serverActions: {
      bodySizeLimit: "2mb",
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
