import { useEffect, useState } from 'react'
import { parseBivariate, type BivariateRow } from '../../utils/dashboardMetrics'

const BASE = import.meta.env.BASE_URL
const cache = new Map<string, BivariateRow[]>()
export async function fetchEvidence(path: string, signal: AbortSignal): Promise<BivariateRow[]> {
  const cached = cache.get(path)
  if (cached) return cached
  const response = await fetch(`${BASE}data/${path}`, { signal })
  if (!response.ok) throw new Error('Evidence unavailable')
  const rows = parseBivariate(await response.json())
  cache.set(path, rows)
  return rows
}

export function evidencePath(province: string, district = '') {
  return district ? `bivariate_by_amphoe/${province}/${district}.json`
    : province ? `bivariate_by_province/${province}.json` : 'bivariate_legend_C.json'
}

export function useDashboardEvidence(region: string, province: string, district: string) {
  const path = region === 'C' ? evidencePath(province, district) : ''
  const [attempt, retry] = useState(0)
  const [result, setResult] = useState<{ key: string; rows: BivariateRow[]; error: boolean }>({ key: '', rows: [], error: false })
  const key = `${path}:${attempt}`
  useEffect(() => {
    if (!path) return
    const controller = new AbortController()
    fetchEvidence(path, controller.signal)
      .then(rows => { if (!controller.signal.aborted) setResult({ key, rows, error: false }) })
      .catch(() => { if (!controller.signal.aborted) setResult({ key, rows: [], error: true }) })
    return () => controller.abort()
  }, [path, key])
  return {
    rows: path && result.key === key ? result.rows : [],
    status: !path ? 'unavailable' : result.key !== key ? 'loading' : result.error ? 'error' : 'ready',
    retry: () => retry(n => n + 1),
  }
}
