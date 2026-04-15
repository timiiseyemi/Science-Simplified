import openai from "@/lib/openai";
import { query } from "@/lib/db";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

// Configure Cloudinary (same pattern as upload-image route)
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const TTS_MODEL = "tts-1";
const TTS_VOICE = "nova";
const MAX_CHUNK_LENGTH = 4000;

/**
 * Strip HTML to plain text suitable for TTS.
 */
function stripHtml(html) {
  if (!html) return "";

  let text = html;

  // Convert block-level elements to newlines
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/(?:p|div|h[1-6]|li|blockquote|tr)>/gi, "\n");
  text = text.replace(/<(?:hr)\s*\/?>/gi, "\n");

  // Remove all remaining tags
  text = text.replace(/<[^>]+>/g, "");

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–");

  // Collapse excessive whitespace and newlines
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.replace(/[ \t]+/g, " ");
  text = text.trim();

  return text;
}

/**
 * Split text into chunks at sentence boundaries, staying under maxLength.
 */
function chunkText(text, maxLength = MAX_CHUNK_LENGTH) {
  if (text.length <= maxLength) return [text];

  const chunks = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Find the last sentence boundary within the limit
    const slice = remaining.slice(0, maxLength);
    const lastSentenceEnd = Math.max(
      slice.lastIndexOf(". "),
      slice.lastIndexOf("! "),
      slice.lastIndexOf("? "),
      slice.lastIndexOf(".\n"),
      slice.lastIndexOf("!\n"),
      slice.lastIndexOf("?\n")
    );

    let splitAt;
    if (lastSentenceEnd > maxLength * 0.3) {
      // Split after the sentence-ending punctuation
      splitAt = lastSentenceEnd + 1;
    } else {
      // No good sentence boundary — split at last space
      const lastSpace = slice.lastIndexOf(" ");
      splitAt = lastSpace > 0 ? lastSpace : maxLength;
    }

    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  return chunks.filter((c) => c.length > 0);
}

/**
 * Generate TTS audio for a single text chunk via OpenAI.
 * Returns a Buffer of MP3 data.
 */
async function generateChunkAudio(text) {
  const response = await openai.audio.speech.create({
    model: TTS_MODEL,
    voice: TTS_VOICE,
    input: text,
    response_format: "mp3",
  });

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Upload an MP3 buffer to Cloudinary.
 * Returns the secure_url.
 */
async function uploadAudioToCloudinary(buffer, articleId) {
  const readableStream = new Readable({
    read() {
      this.push(buffer);
      this.push(null);
    },
  });

  const result = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
        folder: "article-audio",
        public_id: `article-${articleId}`,
        overwrite: true,
        upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    readableStream.pipe(uploadStream);
  });

  return result.secure_url;
}

/**
 * Generate TTS audio for a published article and store it.
 *
 * @param {number} articleId - The article's database ID
 * @param {string} title - The article title
 * @param {string} innertext - The article HTML content
 * @returns {{ audioUrl: string }} The Cloudinary URL of the generated audio
 */
export async function generateArticleAudio(articleId, title, innertext) {
  // Build full text for TTS
  const plainText = stripHtml(innertext);
  const fullText = `${title}.\n\n${plainText}`;

  if (!fullText.trim() || fullText.trim().length < 10) {
    console.log(`Skipping TTS for article ${articleId}: text too short`);
    return { audioUrl: null };
  }

  console.log(
    `Generating TTS for article ${articleId} (${fullText.length} chars)...`
  );

  // Chunk the text
  const chunks = chunkText(fullText);
  console.log(`Split into ${chunks.length} chunk(s)`);

  // Generate audio for each chunk sequentially
  const audioBuffers = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log(
      `Generating chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)...`
    );
    const buffer = await generateChunkAudio(chunks[i]);
    audioBuffers.push(buffer);
  }

  // Concatenate all MP3 buffers
  const combinedBuffer = Buffer.concat(audioBuffers);
  console.log(
    `Combined audio: ${(combinedBuffer.length / 1024 / 1024).toFixed(2)} MB`
  );

  // Upload to Cloudinary
  const audioUrl = await uploadAudioToCloudinary(combinedBuffer, articleId);
  console.log(`Uploaded to Cloudinary: ${audioUrl}`);

  // Save URL to database
  await query("UPDATE article SET audio_url = $1 WHERE id = $2", [
    audioUrl,
    articleId,
  ]);

  return { audioUrl };
}
