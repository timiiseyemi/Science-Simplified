export const revalidate = 0;

import { query } from "@/lib/db";
import { NextResponse } from "next/server";


// 🔍 Helper to fetch from main `article` table
async function getFromArticle(id) {
    return await query(
        `
        SELECT 
            a.*, 
            p.email, 
            p.name, 
            p.photo, 
            p.bio, 
            p.degree, 
            p.university, 
            p.linkedin, 
            p.lablink,
            (SELECT COUNT(*) FROM article_likes al WHERE al.article_id = a.id) AS like_count
        FROM article a
        LEFT JOIN profile p ON (a.certifiedby->>'userId')::INTEGER = p.user_id
        WHERE a.id = $1
        `,
        [id]
    );
}

// 🔍 Helper to fetch from `pending_article`
async function getFromPending(id) {
    return await query(
        `
        SELECT *
        FROM pending_article
        WHERE id = $1
        `,
        [id]
    );
}

// 🔍 Helper to fetch from `pending_with_assignments`
async function getFromPendingAssignments(id) {
    return await query(
        `
        SELECT pa.*
        FROM pending_with_assignments pa
        WHERE pa.id = $1
        `,
        [id]
    );
}



// ======================
//       GET ARTICLE
// ======================
export async function GET(request, { params }) {
    const { id } = params;
    const articleId = parseInt(id, 10);

    if (isNaN(articleId)) {
        return NextResponse.json(
            { success: false, message: "Invalid article ID" },
            { status: 400 }
        );
    }

    try {
        // 1️⃣ Check main published article table
        const articleResult = await getFromArticle(articleId);
        if (articleResult.rows.length > 0) {
            return NextResponse.json(articleResult.rows[0]);
        }

        // 2️⃣ Check pending_article table
        const pendingResult = await getFromPending(articleId);
        if (pendingResult.rows.length > 0) {
            return NextResponse.json(pendingResult.rows[0]);
        }

        // 3️⃣ Check pending_with_assignments
        const assignedResult = await getFromPendingAssignments(articleId);
        if (assignedResult.rows.length > 0) {
            return NextResponse.json(assignedResult.rows[0]);
        }

        // Nothing found
        return NextResponse.json(
            { success: false, message: "Article not found in any table" },
            { status: 404 }
        );

    } catch (error) {
        console.error("❌ Error fetching article:", error);
        return NextResponse.json(
            { success: false, message: "Error fetching article" },
            { status: 500 }
        );
    }
}



// =========================
//  PATCH — Update image_url
// =========================
export async function PATCH(request, { params }) {
    const { id } = params;
    const articleId = parseInt(id);

    try {
        const { imageUrl } = await request.json();
        if (!imageUrl) {
            return NextResponse.json(
                { success: false, message: "No imageUrl provided" },
                { status: 400 }
            );
        }

        // update in main article table only
        const updateResult = await query(
            `
            UPDATE article
            SET image_url = $1
            WHERE id = $2
            RETURNING *
            `,
            [imageUrl, articleId]
        );

        return NextResponse.json({
            success: true,
            article: updateResult.rows[0],
        });

    } catch (error) {
        console.error("❌ PATCH image update error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to update article image" },
            { status: 500 }
        );
    }
}