// A true two-axis bilinear blend (interpolated in HSV, hue via shortest path)
// between four corner colors — navy (Low prob / short dur), purple (Low / long),
// coral (High / short) and yellow (High / long). This reads smoothly across BOTH
// probability and duration; a flattened 1D rainbow (an earlier scheme) looked
// fine within each row but jumped backward in hue at every row boundary, since
// the grid displays probability High->Low top-to-bottom while class_id runs
// Low->High. Shared with the province_bivariate raster palette
// (public/data/province_bivariate) — keep in sync if that raster is regenerated.
export const BIV_COLORS: Record<number, string> = {
  1: '#140080', 2: '#4f06a3', 3: '#9d0fc7',
  4: '#be25b7', 5: '#ce2589', 6: '#de244e',
  7: '#fb626c', 8: '#f88b4f', 9: '#f5cb3c',
}

// class_id = probability tier (0/1/2 = Low/Medium/High) * 3 + duration tier (1/2/3 = short/medium/long)
export const BIV_PROBABILITY_ROWS = ['>=75', '50-<75', '<50']
export const BIV_DURATION_COLS = ['>0-<3', '3-<5', '>=5']

export function bivClassId(probRowIdx: number, durationColIdx: number): number {
  const probOrder = [2, 1, 0][probRowIdx] // High, Medium, Low -> class ids 7-9,4-6,1-3
  return probOrder * 3 + durationColIdx + 1
}
