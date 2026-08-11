export const RECOMMEND_PRICE_CAP = 560;
export const RECOMMEND_DISTANCE_TIER1_KM = 0.5;

/**
 * Recommendation tier per the Master List rules:
 *  1 = within 500m AND price within cap
 *  2 = price within cap, but farther than 500m
 *  3 = price over cap (regardless of distance)
 */
export function computeRecommendLevel(distanceKm: number | null | undefined, pricePerNight: number | null | undefined): number {
  if (pricePerNight == null || pricePerNight > RECOMMEND_PRICE_CAP) return 3;
  if (distanceKm == null) return 2;
  return distanceKm <= RECOMMEND_DISTANCE_TIER1_KM ? 1 : 2;
}
