/** User-agents used by AI search, chat browsing, and training crawlers. */
export const AI_CRAWLER_AGENTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "meta-externalagent",
  "FacebookBot",
  "Bytespider",
  "CCBot",
] as const;

export const PUBLIC_DISALLOW_PATHS = [
  "/admin",
  "/host",
  "/account",
  "/booking",
  "/cart",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/api/",
] as const;
