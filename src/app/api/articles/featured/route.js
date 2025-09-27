export const revalidate = 0;

import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 1) Get ordered IDs
    const featuredResult = await query(
      "SELECT article_ids FROM featured LIMIT 1"
    );
    const articleIds = featuredResult.rows[0]?.article_ids || [];

    if (!articleIds.length) {
      return NextResponse.json([]);
    }

    // 2) Fetch rows, join profile, alias fields, preserve order
    const sql = `
      SELECT
        a.*,
        p.photo      AS author_image_url,
        p.name       AS author_name,
        p.degree     AS author_degree,
        p.university AS author_university
      FROM article a
      LEFT JOIN profile p
        ON COALESCE(
             (a.certifiedby->0->>'userId'),   -- array case: [{ userId, ... }]
             (a.certifiedby->>'userId')       -- object case: { userId, ... }
           )::INT = p.user_id
      WHERE a.id = ANY($1::int[])
      ORDER BY array_position($1::int[], a.id);
    `;

    const { rows } = await query(sql, [articleIds]);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching featured articles:", error);
    return NextResponse.json(
      { message: "Error fetching featured articles" },
      { status: 500 }
    );
  }
}
