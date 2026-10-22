/**
 * Photos in public/images, downloaded from Pexels by scripts/fetch-photos.mjs
 * (credits are listed there). The people shown are models, not our users.
 * To swap one, change its id in that script and run `bun run images`.
 */

export interface Illustration {
  src: string;
  width: number;
  height: number;
}

const scene = (name: string): Illustration => ({
  src: `/images/${name}.webp`,
  width: 1200,
  height: 800,
});

export const HERO_IMAGE: Illustration = { src: "/images/hero.webp", width: 880, height: 960 };
export const SESSIONS_IMAGE = scene("sessions");
export const PROVIDERS_IMAGE = scene("providers");

const CATEGORY_IMAGES: Record<string, Illustration> = {
  scholarship: scene("category-scholarship"),
  training: scene("category-training"),
  apprenticeship: scene("category-apprenticeship"),
  employment: scene("category-employment"),
  local_work: scene("category-local_work"),
  contract: scene("category-local_work"),
};

export function categoryImage(type: string): Illustration {
  return CATEGORY_IMAGES[type] ?? CATEGORY_IMAGES.employment;
}

/**
 * A listing's own photo when it has one in public/images (all 3:2, like the
 * category pictures), otherwise its category picture. Remote addresses are
 * ignored so a provider can't point the site at an unknown host.
 */
export function listingImage(listing: {
  image_url: string | null;
  opportunity_type: string;
}): Illustration {
  if (listing.image_url?.startsWith("/images/")) {
    return { src: listing.image_url, width: 1200, height: 800 };
  }
  return categoryImage(listing.opportunity_type);
}
