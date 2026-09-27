/**
 * Picking the one photo worth showing. Image search returns a grid of
 * results of mixed quality; the tutor shows the best one first (chat and
 * voice alike): large, from a reputable source, on topic, and not a
 * watermarked stock thumbnail, a logo or clip art.
 */
import type { WebImage } from "../../shared/types.js";

const tokens = (text: string) =>
  (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((token) => token.length > 2);

/** Watermarked stock and pin boards make poor teaching pictures. */
const WEAK_SOURCES =
  /(?:shutterstock|alamy|dreamstime|istockphoto|gettyimages|123rf|depositphotos|vecteezy|freepik|canstockphoto|bigstockphoto|pinterest|pinimg|stock\.adobe|adobestock|pond5|agefotostock|storyblocks)\./i;
const STRONG_SOURCES =
  /(?:wikipedia\.org|wikimedia\.org|britannica\.com|nasa\.gov|nationalgeographic\.com|nih\.gov|smithsonianmag\.com|si\.edu|bbc\.co\.uk|nature\.com|\.edu$|\.gov$|museum)/i;

/** Orders photo results best-first: the one shown should be large, clean and on topic. */
export function rankImages(images: WebImage[], query: string): WebImage[] {
  const wanted = tokens(query);
  const scored = images.map((image, rank) => {
    let score = 3 - rank * 0.45; // the search engine's own order counts
    const { width = 0, height = 0 } = image;
    if (width && height) {
      const short = Math.min(width, height);
      score += short >= 700 ? 1.2 : short >= 450 ? 0.7 : short < 260 ? -1.6 : 0;
      const ratio = width / height;
      if (ratio < 0.55 || ratio > 2.3) score -= 1;
    }
    const domain = `${image.domain} ${image.imageUrl}`;
    if (WEAK_SOURCES.test(domain)) score -= 2.2;
    if (STRONG_SOURCES.test(image.domain)) score += 0.9;
    if (/\.svg(?:$|\?)/i.test(image.imageUrl)) score -= 0.4;
    const title = new Set(tokens(image.title));
    if (wanted.length) score += (wanted.filter((word) => title.has(word)).length / wanted.length) * 1.2;
    if (/\b(?:logo|icon|clipart|clip art|vector|cartoon|meme|template)\b/i.test(image.title)) score -= 0.8;
    return { image, score };
  });
  return scored.sort((a, b) => b.score - a.score).map((item) => item.image);
}
