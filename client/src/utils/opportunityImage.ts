import type { VolunteerOpportunity } from "../types/VolunteerOpportunity";

/**
 * Returns the image URL for an opportunity card.
 *
 * Priority:
 *   1. Admin-uploaded imageUrl stored in the database
 *   2. A category-based fallback from Unsplash (free, no API key needed)
 */
export const CATEGORY_FALLBACKS: Record<string, string> = {
  Education: "/opportunities/community-tutor.png",
  Environment: "/opportunities/tree-planting.jpg",
  Outreach: "/opportunities/food-drive.jpg",
};

export const DEFAULT_FALLBACK = "/opportunities/community-tutor.png";

export function isValidImageUrl(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("data:image/")
  );
}

export function getOpportunityImageUrl(opportunity: VolunteerOpportunity): string {
  if (isValidImageUrl(opportunity.imageUrl)) {
    return opportunity.imageUrl!.trim();
  }
  return CATEGORY_FALLBACKS[opportunity.type] ?? DEFAULT_FALLBACK;
}

/**
 * React img onError handler — swap to the category-specific fallback or default fallback if the src fails to load.
 * Usage: <img src={...} data-fallback={...} onError={useFallbackImage} />
 */
export function useFallbackImage(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  const fallback = img.dataset.fallback || DEFAULT_FALLBACK;
  if (img.src !== fallback) {
    img.src = fallback;
  } else if (img.src !== DEFAULT_FALLBACK) {
    img.src = DEFAULT_FALLBACK;
  }
}
