// middleware.js
import { NextResponse } from "next/server";
import { verify } from "jsonwebtoken";

const ADMIN_API = [
  "/api/editors",
  "/api/articles/assign",
  "/api/admin",
  "/api/articles/featured",
];

// NEW: protect admin UI pages (not API)
const ADMIN_PAGES = ["/admin/magic-links"];

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // 1) Public pages
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup")
  ) {
    return NextResponse.next();
  }

  // 2) Must be authenticated (for everything else)
  const token = req.cookies.get("auth")?.value;

  if (!token) {
    // APIs → JSON
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    // Pages → redirect
    return NextResponse.redirect(new URL("/login", req.url));
  }

  let decoded;
  try {
    decoded = verify(token, process.env.JWT_SECRET || "your-secret-key");
    req.user = decoded;
  } catch {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  /** -----------------------------------------------------
   * 3) Admin-ONLY APIs
   * --------------------------------------------------- */
  if (pathname.startsWith("/api")) {
    const isAdminApi = ADMIN_API.some((p) => pathname.startsWith(p));
    if (isAdminApi && !decoded.isAdmin) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
  }

  /** -----------------------------------------------------
   * 4) Admin-ONLY PAGES (Magic Link Admin)
   * --------------------------------------------------- */
  const isAdminPage = ADMIN_PAGES.some((p) => pathname.startsWith(p));

  if (isAdminPage && !decoded.isAdmin) {
    // non-admin → redirect home
    return NextResponse.redirect(new URL("/", req.url));
  }

  // 5) All good
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
