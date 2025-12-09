// lib/adminGuard.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";

export function requireAdmin(req) {
  const token = req.cookies.get("auth")?.value;
  if (!token) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  let payload;
  try {
    payload = verify(token, process.env.JWT_SECRET || "your-secret-key");
  } catch {
    return NextResponse.json({ message: "Invalid token" }, { status: 401 });
  }

  console.log("Decoded JWT payload:", payload);


  if (!payload.isAdmin && payload.role !== "editor") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return payload;
}

