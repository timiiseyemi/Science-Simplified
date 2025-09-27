"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { tenant } from "@/lib/config";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import "./ArticleCard.scss";

// Truncate helper
const truncateText = (text, maxLength) =>
  typeof text === "string" && text.length > maxLength
    ? text.slice(0, maxLength) + "..."
    : text;

const articleThumbnailPlaceholder = `/assets/${tenant.pathName}/${tenant.articleThumbnailPlaceholder}`;

// Fallback Author Image
const FallbackAuthorImage = ({ authorName }) => {
  const firstLetter = (authorName || "A").charAt(0).toUpperCase();
  return (
    <div className="fallback-author-image">
      <p className="body-small">{firstLetter}</p>
    </div>
  );
};

function ArticleCard({
  id,
  imageUrl,
  date,
  title,
  summary,
  authorImageUrl,
  authorName,
  authorCreds,
  authorInstitution,
  pageType,
  ...rest // capture alternates (author_name, name, photo, degree, university, etc.)
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Normalize all author-related fields so callers can pass either aliased or raw profile fields
  const {
    displayAuthorName,
    displayAuthorImageUrl,
    displayAuthorCreds,
    displayAuthorInstitution,
  } = useMemo(() => {
    const nameNorm =
      authorName ??
      rest.author_name ??
      rest.name ??
      rest.publisher_name ??
      "Anonymous";

    const photoNorm =
      authorImageUrl ??
      rest.author_image_url ??
      rest.photo ??
      null;

    const credsNorm =
      authorCreds ??
      rest.author_degree ??
      rest.degree ??
      null;

    const instNorm =
      authorInstitution ??
      rest.author_university ??
      rest.university ??
      null;

    return {
      displayAuthorName: nameNorm,
      displayAuthorImageUrl: photoNorm,
      displayAuthorCreds: credsNorm,
      displayAuthorInstitution: instNorm,
    };
  }, [
    authorName,
    authorImageUrl,
    authorCreds,
    authorInstitution,
    rest.author_name,
    rest.publisher_name,
    rest.name,
    rest.author_image_url,
    rest.photo,
    rest.author_degree,
    rest.degree,
    rest.author_university,
    rest.university,
  ]);

  const handleFeatureStatus = async (shouldBeFeatured) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/articles/actions/feature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: id, shouldBeFeatured }),
      });
      if (!response.ok) throw new Error("Failed to update featured status");
      toast.success("Featured status updated successfully!");
      window.location.reload();
    } catch (error) {
      console.error("Error updating featured status:", error);
      toast.error("Error updating featured status");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePendingArticle = () => router.push(`/pending-articles/${id}`);
  const handleAssignedArticles = () => router.push(`/assigned-articles/${id}`);

  const renderButton = () => {
    if (pageType === "featured") {
      return (
        <Button
          className="article-card__button btn btn-primary-green"
          onClick={() => handleFeatureStatus(false)}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-8 w-8 animate-spin" />
              Please wait
            </>
          ) : (
            "Unfeature"
          )}
        </Button>
      );
    }
    if (pageType === "unfeatured") {
      return (
        <Button
          className="article-card__button btn btn-primary-green"
          onClick={() => handleFeatureStatus(true)}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-8 w-8 animate-spin" />
              Please wait
            </>
          ) : (
            "Feature"
          )}
        </Button>
      );
    }
    if (pageType === "pending") {
      return (
        <Button
          className="article-card__button btn btn-primary-green"
          onClick={handlePendingArticle}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-8 w-8 animate-spin" />
              Please wait
            </>
          ) : (
            "Review"
          )}
        </Button>
      );
    }
    if (pageType === "assigned") {
      return (
        <Button
          className="article-card__button btn btn-primary-green"
          onClick={handleAssignedArticles}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-8 w-8 animate-spin" />
              Please wait
            </>
          ) : (
            "Review"
          )}
        </Button>
      );
    }
    return null;
  };

  return (
    <article className="article-card">
      <div className="article-card__image-container">
        <Image
          src={imageUrl || articleThumbnailPlaceholder}
          alt={`Article image for ${title}`}
          className="article-card__image"
          // Next 13+: prefer "fill" or explicit width/height; keeping your sizing:
          width={420}
          height={290}
          loading="lazy"
          style={{ objectFit: "cover", objectPosition: "center" }}
        />
        {renderButton()}
      </div>

      <div className="article-card__content">
        <time className="article-card__date">{date}</time>

        <h2 className="article-card__title">{truncateText(title, 80)}</h2>

        <p className="article-card__summary">
          <span
            dangerouslySetInnerHTML={{
              __html: truncateText(summary, 180),
            }}
          />
          {pageType !== "pending" && pageType !== "assigned" && (
            <a href={`/articles/${id}`} className="article-card__read-more">
              read more
            </a>
          )}
        </p>

        <div className="article-card__author">
          {displayAuthorImageUrl ? (
            <Image
              src={displayAuthorImageUrl}
              alt={`Author image for ${displayAuthorName}`}
              className="article-card__author-image"
              width={50}
              height={50}
              loading="lazy"
              style={{ objectFit: "cover", objectPosition: "center" }}
            />
          ) : (
            <FallbackAuthorImage authorName={displayAuthorName} />
          )}

          <div className="article-card__author-text">
            <span className="article-card__author-name">
              {displayAuthorName}
            </span>

            {(displayAuthorCreds || displayAuthorInstitution) && (
              <div className="article-card__author-meta">
                {displayAuthorCreds && (
                  <span className="article-card__author-creds">
                    {displayAuthorCreds}
                  </span>
                )}
                {displayAuthorInstitution && (
                  <span className="article-card__author-institution">
                    {displayAuthorCreds ? <><br /></> : null}
                    {displayAuthorInstitution}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default ArticleCard;
