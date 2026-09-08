import { useEffect, useState } from 'react'

const BASE = import.meta.env.BASE_URL

export interface AmphoeProps {
  AMP_CODE: string
  AMPHOE_E: string
  PROV_CODE: number
  PROV_NAM_E: string
  Region: string
  px_type1: number
  px_type2: number
  area_rai1: number
  area_rai2: number
  area_aban: number
  area_tot: number
  pct_aban: number
}

export type AmphoeFeature = GeoJSON.Feature<GeoJSON.Geometry, AmphoeProps>

export interface Aggregate {
  pxType1: number
  pxType2: number
  pxTotal: number
  areaAban: number
  areaTot: number
  pctAban: number
  pct1: number
  pct2: number
}

export function aggregate(features: AmphoeFeature[]): Aggregate {
  let pxType1 = 0
  let pxType2 = 0
  let areaAban = 0
  let areaTot = 0
  for (const f of features) {
    pxType1 += f.properties.px_type1
    pxType2 += f.properties.px_type2
    areaAban += f.properties.area_aban
    areaTot += f.properties.area_tot
  }
  const pxTotal = pxType1 + pxType2
  return {
    pxType1,
    pxType2,
    pxTotal,
    areaAban,
    areaTot,
    pctAban: areaTot > 0 ? (areaAban / areaTot) * 100 : 0,
    pct1: pxTotal > 0 ? (pxType1 / pxTotal) * 100 : 0,
    pct2: pxTotal > 0 ? (pxType2 / pxTotal) * 100 : 0,
  }
}

export function topProvinces(features: AmphoeFeature[], n = 5) {
  const byProv = new Map<string, { code: string; name: string; area: number }>()
  for (const f of features) {
    const key = String(f.properties.PROV_CODE)
    const cur = byProv.get(key) ?? { code: key, name: f.properties.PROV_NAM_E, area: 0 }
    cur.area += f.properties.area_aban
    byProv.set(key, cur)
  }
  return [...byProv.values()].sort((a, b) => b.area - a.area).slice(0, n)
}

export function useBoundaryData() {
  const [features, setFeatures] = useState<AmphoeFeature[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${BASE}data/amphoe_stats.geojson`)
      .then((r) => r.json())
      .then((fc: GeoJSON.FeatureCollection) => {
        setFeatures(fc.features as AmphoeFeature[])
        setLoading(false)
      })
  }, [])

  return { features, loading }
}

export const REGION_NAMES: Record<string, string> = {
  C: 'Central',
  N: 'North',
  NE: 'Northeast',
  E: 'East',
  W: 'West',
  S: 'South',
}
