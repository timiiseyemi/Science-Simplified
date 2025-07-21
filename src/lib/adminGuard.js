// lib/adminGuard.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";

export function requireAdmin() {
  // 1) grab the cookie store
  const cookieStore = cookies();
  const token = cookieStore.get("auth")?.value;
  if (!token) {
    // not logged in
    return NextResponse.json(
      { message: "Not authenticated" },
      { status: 401 }
    );
  }

  let payload;
  try {
    payload = verify(token, process.env.JWT_SECRET || "your-secret-key");
  } catch {
    // bad or expired token
    return NextResponse.json(
      { message: "Invalid token" },
      { status: 401 }
    );
  }

  if (!payload.isAdmin) {
    // not an admin
    return NextResponse.json(
      { message: "Forbidden" },
      { status: 403 }
    );
  }

  // success: return the decoded token if you need it
  return payload;
}
