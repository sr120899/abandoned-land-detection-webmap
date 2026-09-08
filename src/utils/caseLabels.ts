// Case study points are stored/keyed everywhere (CSV, photos, geojson) by their
// internal id (point_1, point_4, point_5) — these labels are display-only.
export const CASE_ORDER = ['point_1', 'point_4', 'point_5']

export const CASE_LABELS: Record<string, string> = {
  point_1: 'Case study 1',
  point_4: 'Case study 2',
  point_5: 'Case study 3',
}

export function caseLabel(caseName: string): string {
  return CASE_LABELS[caseName] ?? caseName
}
