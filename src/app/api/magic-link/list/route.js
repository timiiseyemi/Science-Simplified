import { NextResponse } from "next/server";
import { tenantQuery } from "@/lib/tenantDb";
import { sites } from "@/lib/sites";

export async function GET() {
    try {
        const allLinks = [];

        // Loop over all tenant keys (NF, EB, CF, HS, etc)
        const key = tenant.shortName;
        try {
            const result = await tenantQuery(
                key,
                "SELECT id, email, token_hash, redirect_url, created_at, used FROM magic_links ORDER BY created_at DESC"
            );

            // Add tenant field so admin UI knows which is which
            result.rows.forEach((row) => {
                allLinks.push({
                    ...row,
                    tenant: key,
                    url: `${process.env.APIHOSTNAME}/api/magic-link/verify?tenant=${key}&token=__TOKEN__`
                });
            });
        } catch (e) {
            // Ignore tenants that do not have magic_links table yet
        }
        

        return NextResponse.json({ links: allLinks });
    } catch (error) {
        console.error("Error listing magic links:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
