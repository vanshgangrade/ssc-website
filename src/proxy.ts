import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isDiaryHost } from "@/lib/diaryHost";

// films.silverscreenbitsgoa.com serves the film diary from src/app/diary with clean URLs:
//   films.…/                 → /diary
//   films.…/film/<slug>      → /diary/film/<slug>
//   films.…/<handle>         → /diary/<handle>
export function proxy(request: NextRequest) {
  if (!isDiaryHost(request.headers.get("host"))) return NextResponse.next();

  const { pathname } = request.nextUrl;
  // Static files (anything with an extension) are shared with the main site.
  if (/\.[a-zA-Z0-9]+$/.test(pathname)) return NextResponse.next();
  // Someone typed the internal path on the subdomain: send them to the clean one.
  if (pathname === "/diary" || pathname.startsWith("/diary/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice("/diary".length) || "/";
    return NextResponse.redirect(url);
  }

  const url = request.nextUrl.clone();
  url.pathname = pathname === "/" ? "/diary" : `/diary${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Leave auth, APIs, Next internals, the sign-in page and static files alone.
  matcher: ["/((?!api|_next/static|_next/image|signin|club/|posters/|recap/|favicon.ico).*)"],
};
