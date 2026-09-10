import type { AmphoeFeature } from '../hooks/useBoundaryData'

export type RankMetric = 'area' | 'share' | 'density' | 'priority'
export type RankLevel = 'region' | 'province' | 'district'
export interface AreaGroup {
  code: string
  name: string
  area: number
  total: number
}
export interface BivariateRow {
  class_id: number
  pixel_count: number
  area_rai: number
}

// Missing or incomplete exports are not equivalent to zero detected area.
export function parseBivariate(value: unknown): BivariateRow[] {
  if (!Array.isArray(value) || value.length !== 9) throw new Error('Incomplete evidence data')
  const ids = new Set<number>()
  for (const row of value) {
    if (!row || !Number.isInteger(row.class_id) || row.class_id < 1 || row.class_id > 9 ||
      ids.has(row.class_id) || !Number.isFinite(row.area_rai) || row.area_rai < 0 ||
      !Number.isInteger(row.pixel_count) || row.pixel_count < 0) throw new Error('Invalid evidence data')
    ids.add(row.class_id)
  }
  return value as BivariateRow[]
}

export function summarizeEvidence(rows: BivariateRow[]) {
  const durations = [0, 0, 0]
  const durationPixels = [0, 0, 0]
  let pixels = 0
  for (const row of rows) {
    durations[(row.class_id - 1) % 3] += row.area_rai
    durationPixels[(row.class_id - 1) % 3] += row.pixel_count
    pixels += row.pixel_count
  }
  return {
    durations,
    durationShares: durationPixels.map(n => pixels > 0 ? n / pixels * 100 : null),
    pixels,
    priority: rows.find(row => row.class_id === 9)?.area_rai ?? null,
  }
}

export function groupAreas(features: AmphoeFeature[], level: RankLevel): AreaGroup[] {
  const groups = new Map<string, AreaGroup>()
  for (const { properties: p } of features) {
    const code = level === 'region' ? p.Region : level === 'province' ? String(p.PROV_CODE) : p.AMP_CODE
    const name = level === 'region' ? p.Region : level === 'province' ? p.PROV_NAM_E : p.AMPHOE_E
    const group = groups.get(code) ?? { code, name, area: 0, total: 0 }
    group.area += p.area_aban
    group.total += p.area_tot
    groups.set(code, group)
  }
  return [...groups.values()]
}

export function rankAreas(groups: AreaGroup[], metric: RankMetric, priority: Record<string, number | null> = {}) {
  return groups.map(group => ({
    ...group,
    value: metric === 'area' ? group.area
      : metric === 'priority' ? priority[group.code] ?? null
      : group.total > 0 ? group.area / group.total * (metric === 'share' ? 100 : 625) : null,
  })).filter((group): group is AreaGroup & { value: number } => group.value !== null)
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name)).slice(0, 5)
}
