import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";


// Only allow POST method
export async function POST(req) {
    const adminCheck = requireAdmin(req);
    if (adminCheck instanceof NextResponse) return adminCheck;
    
    const { id, certifiedby } = await req.json(); // Parse JSON body from the request

    try {
        // Fetch the article from the pending_article table, including image_url
        const result = await query(
            "SELECT * FROM pending_article WHERE id = $1",
            [id]
        );
        const article = result.rows[0];

        // Check if the article exists
        if (!article) {
            return NextResponse.json(
                { success: false, message: "Article not found" },
                { status: 404 }
            );
        }

        // Insert the article into the article table, including the certifiedby, image_url, and publication_date fields
        // Insert the article into the article table, now including authors
        await query(
            `INSERT INTO article 
            (title, tags, innertext, summary, article_link, publisher, authors, certifiedby, image_url, publication_date) 
            VALUES ($1, $2, $3, $4, $5, $6, $7::text[], $8::jsonb, $9, $10)`,
            [
            article.title,          // $1
            article.tags,           // $2
            article.innertext,      // $3
            article.summary,        // $4
            article.article_link,   // $5
            article.publisher,      // $6
            article.authors ?? [],  // $7  -> ensure array; cast as text[] above
            JSON.stringify(certifiedby), // $8
            article.image_url,      // $9
            article.publication_date // $10
            ]
        );
        

        // Delete the article from the pending_article table
        await query("DELETE FROM pending_article WHERE id = $1", [id]);

        return NextResponse.json({
            success: true,
            message: "Article published successfully!",
        });
    } catch (error) {
        console.error("Error publishing article:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
