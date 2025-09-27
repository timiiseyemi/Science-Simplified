export const revalidate = 0;

import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const sql = `
      SELECT
        a.id,
        a.image_url,
        a.publication_date,
        a.title,
        a.summary,
        a.tags,
        a.innertext,
        a.article_link,
        a.publisher,
        a.certifiedby,

        -- author fields from profile
        p.photo      AS author_image_url,
        p.name       AS author_name,
        p.degree     AS author_degree,      -- ← degree
        p.university AS author_university   -- ← university

      FROM article a
      LEFT JOIN profile p
        ON COALESCE((a.certifiedby->0->>'userId'), (a.certifiedby->>'userId'))::INT = p.user_id
      ORDER BY a.id DESC
    `;
    const { rows } = await query(sql);
    return NextResponse.json(rows);
  } catch (err) {
    console.error("Error executing query", err);
    return NextResponse.json({ message: "Error executing query" }, { status: 500 });
  }
}
