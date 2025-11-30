"use client";
import { useState } from "react";

export default function GenerateAIImageButton({ articleId, simplifiedText, onImageGenerated }) {
    const [loading, setLoading] = useState(false);

    async function handleGenerate() {
        if (!simplifiedText || simplifiedText.trim().length < 10) {
            alert("Simplified text is required before generating an image.");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/articles/generate-ai-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    articleId,
                    simplifiedText,
                }),
            });

            const data = await res.json();

            if (!data.success) {
                alert("Failed to generate AI image.");
                setLoading(false);
                return;
            }

            // Call parent function → update UI
            onImageGenerated(data.imageUrl);

        } catch (err) {
            console.error("Error generating AI image:", err);
            alert("An error occurred.");
        }

        setLoading(false);
    }

    return (
        <button
            onClick={handleGenerate}
            disabled={loading}
            className={`px-4 py-2 rounded-md text-white font-semibold 
                ${loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}
            `}
        >
            {loading ? "Generating Image..." : "Generate AI Image"}
        </button>
    );
}