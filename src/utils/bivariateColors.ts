// Fixed CMYK-derived palette (print-safe), running dark blue (Low prob / short
// dur) through purple/pink (mid) to orange/yellow (High prob / long dur).
// Shared with the province_bivariate raster palette
// (public/data/province_bivariate) — keep in sync if that raster is regenerated.
export const BIV_COLORS: Record<number, string> = {
  1: '#1B1464', 2: '#402078', 3: '#6B2C85',
  4: '#5B257F', 5: '#90358A', 6: '#C65377',
  7: '#B14478', 8: '#E17955', 9: '#F6D746',
}

// class_id = probability tier (0/1/2 = Low/Medium/High) * 3 + duration tier (1/2/3 = short/medium/long)
export const BIV_PROBABILITY_ROWS = ['>=75', '50-<75', '<50']
export const BIV_DURATION_COLS = ['>0-<3', '3-<5', '>=5']

export function bivClassId(probRowIdx: number, durationColIdx: number): number {
  const probOrder = [2, 1, 0][probRowIdx] // High, Medium, Low -> class ids 7-9,4-6,1-3
  return probOrder * 3 + durationColIdx + 1
}
