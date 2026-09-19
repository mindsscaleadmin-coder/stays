import createMiddleware from "next-intl/middleware";
import { type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import {
  COUNTRY_SEO_COOKIE,
  normalizeCountryCode,
} from "@/lib/seo/country-seo-cookie";

const intlMiddleware = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const response = intlMiddleware(request);
  const market = request.nextUrl.searchParams.get("market");

  if (market) {
    response.cookies.set(COUNTRY_SEO_COOKIE, normalizeCountryCode(market), {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
