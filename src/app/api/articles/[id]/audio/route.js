import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { generateArticleAudio } from "@/lib/tts";

// GET — check audio status (public)
export async function GET(req, context) {
  const { id } = await context.params;

  try {
    const result = await query(
      "SELECT audio_url FROM article WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Article not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      audioUrl: result.rows[0].audio_url,
    });
  } catch (error) {
    console.error("Error checking audio status:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST — regenerate audio (admin only)
export async function POST(req, context) {
  const adminCheck = requireAdmin(req);
  if (adminCheck instanceof NextResponse) return adminCheck;

  const { id } = await context.params;

  try {
    const result = await query(
      "SELECT id, title, innertext FROM article WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Article not found" },
        { status: 404 }
      );
    }

    const article = result.rows[0];
    const { audioUrl } = await generateArticleAudio(
      article.id,
      article.title,
      article.innertext
    );

    return NextResponse.json({
      success: true,
      audioUrl,
      message: "Audio regenerated successfully",
    });
  } catch (error) {
    console.error("Error regenerating audio:", error);
    return NextResponse.json(
      { success: false, message: "Failed to generate audio" },
      { status: 500 }
    );
  }
}
