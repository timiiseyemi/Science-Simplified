import { NextResponse } from "next/server";
import { tenantQuery } from "@/lib/tenantDb";
import { requireAdmin } from "@/lib/adminGuard";
import { tenant as defaultTenant } from "@/lib/config";

export async function DELETE(req) {
  const adminCheck = requireAdmin(req);
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing id" },
        { status: 400 }
      );
    }

    // 🔒 Use backend tenant only — prevent cross-tenant deletion
    const tenant = defaultTenant.shortName;

    // Perform deletion
    await tenantQuery(
      tenant,
      "DELETE FROM magic_links WHERE id = $1",
      [id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete magic link error:", error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
