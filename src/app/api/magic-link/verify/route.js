// src/app/api/magic-link/verify/route.js
import { NextResponse } from "next/server";
import crypto from "crypto";
import { tenantQuery } from "@/lib/tenantDb";

// Tenant → Domain mapping (final)
const TENANT_DOMAINS = {
  NF: "https://nfsimplified.com",
  EB: "https://sseb.vercel.app",
  Vitiligo: "https://ssvitiligo.vercel.app",
  CF: "https://sscf-coral.vercel.app",
  ALS: "https://ssals-ten.vercel.app",
  HS: "https://science-simplified-mu.vercel.app/",
  Ashermans: "https://ssashermans.vercel.app",
  RYR1: "https://ssryr1.vercel.app",
  Aicardi: "https://ssaicardi.vercel.app",
  Progeria: "https://ssprogeria.vercel.app",
  RETT: "https://ssrett.vercel.app",
  Canavan: "https://sscanavan.vercel.app",
  HUNTINGTONS: "https://sshuntingtons.vercel.app", 
};

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const tenant = searchParams.get("tenant");
    const token = searchParams.get("token");

    if (!tenant || !token) {
      return NextResponse.json({ error: "Missing tenant or token" }, { status: 400 });
    }

    // Hash token
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Get magic link row
    const sql = `
      SELECT * 
      FROM magic_links 
      WHERE token_hash = $1 AND used = false
    `;
    const { rows } = await tenantQuery(tenant, sql, [tokenHash]);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Invalid or used token" }, { status: 400 });
    }

    const magicLink = rows[0];

    // Check expiration
    if (magicLink.expires_at && new Date() > new Date(magicLink.expires_at)) {
      return NextResponse.json({ error: "Token expired" }, { status: 400 });
    }

    // Mark token as used
    await tenantQuery(tenant, `UPDATE magic_links SET used = true WHERE token_hash = $1`, [tokenHash]);

    // Redirect to tenant domain
    const domain = TENANT_DOMAINS[tenant] || "http://localhost:3000";
    const finalUrl = `${domain}/assigned-articles`;

    return NextResponse.redirect(finalUrl);

  } catch (err) {
    console.error("VERIFY ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
