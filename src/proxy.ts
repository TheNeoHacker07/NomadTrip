import { NextResponse, type NextRequest } from "next/server";
import { isAdminAuthorization } from "@/lib/admin-auth";
import { LOCALE_COOKIE } from "@/i18n/config";
import { localeFromPathname, negotiateLocale } from "@/i18n/negotiate";

// 1. Paths without a locale prefix redirect to /<locale>/… (NEXT_LOCALE cookie, else Accept-Language, else en).
// 2. /<locale>/admin prompts for credentials. Pages and actions re-check, so this is not the only guard.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const lang = localeFromPathname(pathname);
  if (!lang) {
    const target = negotiateLocale(request.cookies.get(LOCALE_COOKIE)?.value, request.headers.get("accept-language"));
    const url = request.nextUrl.clone();
    url.pathname = `/${target}${pathname === "/" ? "" : pathname}`;
    const res = NextResponse.redirect(url);
    res.headers.append("Vary", "Accept-Language, Cookie");
    return res;
  }

  if (/^\/[^/]+\/admin(\/|$)/.test(pathname) && !isAdminAuthorization(request.headers.get("authorization"))) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="NomadTrip admin", charset="UTF-8"' },
    });
  }
  return NextResponse.next();
}

// Skip Next internals and anything with a file extension (static assets, favicon.ico, …).
export const config = { matcher: ["/((?!_next/|api/|.*\\..*).*)"] };
