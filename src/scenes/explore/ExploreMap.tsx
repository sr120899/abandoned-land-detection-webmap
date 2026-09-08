import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { REGION_NAMES } from '../../hooks/useBoundaryData'
import type { AmphoeFeature, AmphoeProps } from '../../hooks/useBoundaryData'

const BASE = import.meta.env.BASE_URL

const NATIONAL_VIEW = { center: [101.2, 13.8] as [number, number], zoom: 4.6 }
const BOUNDARY_DEFAULT_VIEW = { center: [101.0, 13.9] as [number, number], zoom: 5.3 }

const LINE_SOLID: [number, number] = [1, 0]
const LINE_DASHED: [number, number] = [2, 2]

type Basemap = 'dark' | 'satellite' | 'streets'
const BASEMAP_OPTIONS: { id: Basemap; label: string; layerId: string }[] = [
  { id: 'dark', label: 'Dark', layerId: 'basemap-dark' },
  { id: 'satellite', label: 'Satellite', layerId: 'basemap-sat' },
  { id: 'streets', label: 'Streets', layerId: 'basemap-streets' },
]

interface ProvinceProps {
  PROV_CODE: number
  PROV_NAM_E: string
  Region: string
  px_type1: number
  px_type2: number
}

interface Props {
  nationalFeatures: AmphoeFeature[] // unfiltered, used for region bubble totals
  boundaryFeatures: AmphoeFeature[] // region/province/district filtered
  caseFeatures: GeoJSON.Feature[] // case studies within current filter
  regionCode: string
  provinceCode: string
  districtCode: string
  showBoundaryLines: boolean
  showPixelRaster: boolean // display toggle for the classification/analysis raster overlay
  showAnalysis: boolean // Analysis toggle — swaps the raster to bivariate + shows case markers
  hoveredProvince: string // externally-hovered province code (e.g. from the Top 5 bar chart), '' if none
  hoveredDistrict: string // externally-hovered amphoe code (e.g. from the Top districts bar chart), '' if none
  onSelectRegion: (region: string) => void
  onSelectProvince: (provCode: string) => void
  onSelectDistrict: (ampCode: string) => void
  onSelectCase: (caseName: string) => void
  onHoverProvince: (provCode: string) => void
  onHoverDistrict: (ampCode: string) => void
  onClickOutside: () => void // clicked past the current boundary — step back one drill level
}

interface RasterBounds {
  west: number
  south: number
  east: number
  north: number
}

function boundsToCoords(b: RasterBounds): [[number, number], [number, number], [number, number], [number, number]] {
  return [
    [b.west, b.north],
    [b.east, b.north],
    [b.east, b.south],
    [b.west, b.south],
  ]
}

// Area-weighted centroid of a feature's largest ring — a plain vertex average
// can land outside the shape for elongated/concave provinces and amphoes.
function ringCentroid(ring: [number, number][]): { c: [number, number]; area: number } {
  let area = 0, cx = 0, cy = 0
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i]
    const [x1, y1] = ring[i + 1]
    const a = x0 * y1 - x1 * y0
    area += a
    cx += (x0 + x1) * a
    cy += (y0 + y1) * a
  }
  area *= 0.5
  if (Math.abs(area) < 1e-12) return { c: ring[0], area: 0 }
  return { c: [cx / (6 * area), cy / (6 * area)], area: Math.abs(area) }
}

function featureCentroid(geom: GeoJSON.Geometry): [number, number] | null {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : null
  if (!polys) return null
  let best: { c: [number, number]; area: number } | null = null
  for (const poly of polys) {
    const outer = poly[0] as [number, number][]
    if (!outer || outer.length < 4) continue
    const r = ringCentroid(outer)
    if (!best || r.area > best.area) best = r
  }
  return best ? best.c : null
}

const WORLD_RING: [number, number][] = [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]]

// A "donut" polygon covering the whole world with the given geometries punched
// out as holes — filling it dims everything except those cut-out (selected) shapes.
function buildSpotlightMask(geoms: GeoJSON.Geometry[]): GeoJSON.Feature<GeoJSON.Polygon> {
  const holes: [number, number][][] = []
  for (const geom of geoms) {
    const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : []
    for (const poly of polys) {
      if (poly[0]) holes.push(poly[0] as [number, number][])
    }
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [WORLD_RING, ...holes] } }
}

function collectBounds(feats: AmphoeFeature[] | GeoJSON.Feature[]): maplibregl.LngLatBoundsLike | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  const collect = (c: unknown): void => {
    if (!Array.isArray(c)) return
    if (typeof c[0] === 'number') {
      const [x, y] = c as [number, number]
      minX = Math.min(minX, x); maxX = Math.max(maxX, x)
      minY = Math.min(minY, y); maxY = Math.max(maxY, y)
    } else {
      c.forEach(collect)
    }
  }
  for (const f of feats) {
    const geom = f.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon | undefined
    if (geom) collect(geom.coordinates)
  }
  if (!Number.isFinite(minX)) return null
  return [[minX, minY], [maxX, maxY]]
}

function ExploreMap({
  nationalFeatures,
  boundaryFeatures,
  caseFeatures,
  regionCode,
  provinceCode,
  districtCode,
  showBoundaryLines,
  showPixelRaster,
  showAnalysis,
  hoveredProvince,
  hoveredDistrict,
  onSelectRegion,
  onSelectProvince,
  onSelectDistrict,
  onSelectCase,
  onHoverProvince,
  onHoverDistrict,
  onClickOutside,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const hoverRef = useRef<{ source: string; id: string | number } | null>(null)
  const externalHoverRef = useRef<number | null>(null)
  const externalHoverDistrictRef = useRef<string | null>(null)
  const onSelectRegionRef = useRef(onSelectRegion)
  const onSelectProvinceRef = useRef(onSelectProvince)
  const onSelectDistrictRef = useRef(onSelectDistrict)
  const onSelectCaseRef = useRef(onSelectCase)
  const onHoverProvinceRef = useRef(onHoverProvince)
  const onHoverDistrictRef = useRef(onHoverDistrict)
  const onClickOutsideRef = useRef(onClickOutside)
  const regionGeoRef = useRef<GeoJSON.FeatureCollection | null>(null)
  const provinceGeoRef = useRef<GeoJSON.FeatureCollection | null>(null)
  const regionCodeRef = useRef(regionCode)
  const provinceCodeRef = useRef(provinceCode)
  const districtCodeRef = useRef(districtCode)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [basemap, setBasemapState] = useState<Basemap>('satellite')

  onSelectRegionRef.current = onSelectRegion
  onSelectProvinceRef.current = onSelectProvince
  onSelectDistrictRef.current = onSelectDistrict
  onSelectCaseRef.current = onSelectCase
  onHoverProvinceRef.current = onHoverProvince
  onHoverDistrictRef.current = onHoverDistrict
  onClickOutsideRef.current = onClickOutside
  regionCodeRef.current = regionCode
  provinceCodeRef.current = provinceCode
  districtCodeRef.current = districtCode

  function pickBasemap(b: Basemap) {
    setBasemapState(b)
  }

  // Create the map once and keep it mounted for the whole Explore flow.
  useEffect(() => {
    if (!containerRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          'basemap-dark': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
          },
          'basemap-sat': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            attribution: 'Esri World Imagery',
          },
          'basemap-streets': {
            type: 'raster',
            tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [
          { id: 'basemap-dark', type: 'raster', source: 'basemap-dark', paint: { 'raster-opacity': 0.6 } },
          { id: 'basemap-sat', type: 'raster', source: 'basemap-sat', layout: { visibility: 'none' } },
          { id: 'basemap-streets', type: 'raster', source: 'basemap-streets', layout: { visibility: 'none' } },
        ],
      },
      center: NATIONAL_VIEW.center,
      zoom: NATIONAL_VIEW.zoom,
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl(), 'top-right')

    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'boundary-popup' })
    popupRef.current = popup

    function clearHover() {
      const map2 = mapRef.current
      if (map2 && hoverRef.current) {
        map2.setFeatureState(hoverRef.current, { hover: false })
      }
      hoverRef.current = null
      popup.remove()
    }

    function bindHover(
      layerId: string,
      sourceId: string,
      buildHtml: (props: Record<string, unknown>) => string,
      onChange?: (props: Record<string, unknown> | null) => void,
    ) {
      map.on('mousemove', layerId, (e: maplibregl.MapLayerMouseEvent) => {
        const feature = e.features?.[0]
        if (!feature || feature.id === undefined) return
        map.getCanvas().style.cursor = 'pointer'

        if (!hoverRef.current || hoverRef.current.id !== feature.id || hoverRef.current.source !== sourceId) {
          if (hoverRef.current) map.setFeatureState(hoverRef.current, { hover: false })
          hoverRef.current = { source: sourceId, id: feature.id }
          map.setFeatureState(hoverRef.current, { hover: true })
          onChange?.(feature.properties ?? {})
        }
        popup.setLngLat(e.lngLat).setHTML(buildHtml(feature.properties ?? {})).addTo(map)
      })
      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = ''
        clearHover()
        onChange?.(null)
      })
    }

    map.on('load', async () => {
      // Spotlight mask — dims everything outside the currently selected boundary so
      // it stands out. Sits right above the basemap, below every other data layer.
      map.addSource('mask', { type: 'geojson', data: buildSpotlightMask([]) })
      map.addLayer({
        id: 'mask-layer',
        type: 'fill',
        source: 'mask',
        layout: { visibility: 'none' },
        paint: { 'fill-color': '#01030a', 'fill-opacity': 0.75 },
      })

      // --- Pixel-level rasters (bottom of the stack — vector lines/labels draw on top) ---
      map.addSource('province-type', {
        type: 'image',
        url: `${BASE}data/province_type/10.png`,
        coordinates: boundsToCoords({ west: 100, south: 13, east: 100.01, north: 13.01 }),
      })
      map.addLayer({
        id: 'province-type-layer',
        type: 'raster',
        source: 'province-type',
        layout: { visibility: 'none' },
        // Fully opaque — any blending with the basemap shifts the on-screen color away
        // from the legend swatch, and matching the legend exactly matters more here
        // than seeing terrain through the classification.
        paint: { 'raster-opacity': 1, 'raster-resampling': 'nearest' },
      })

      map.addSource('province-bivariate', {
        type: 'image',
        url: `${BASE}data/province_bivariate/10.png`,
        coordinates: boundsToCoords({ west: 100, south: 13, east: 100.01, north: 13.01 }),
      })
      map.addLayer({
        id: 'province-bivariate-layer',
        type: 'raster',
        source: 'province-bivariate',
        layout: { visibility: 'none' },
        // Fully opaque, for the same reason as province-type-layer — the color here
        // IS the confidence/duration signal, so it must render exactly as swatched.
        paint: { 'raster-opacity': 1, 'raster-resampling': 'nearest' },
      })

      // --- Boundary vectors: transparent fill (hit-testing + hover) + white line ---
      const regionGeo = await fetch(`${BASE}data/region_stats.geojson`).then((r) => r.json())
      regionGeoRef.current = regionGeo
      map.addSource('regions', { type: 'geojson', data: regionGeo, promoteId: 'Region' })
      map.addLayer({
        id: 'regions-fill',
        type: 'fill',
        source: 'regions',
        paint: {
          'fill-color': '#ffffff',
          'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.12, 0],
        },
      })
      map.addLayer({
        id: 'regions-line',
        type: 'line',
        source: 'regions',
        paint: { 'line-color': '#ffffff', 'line-width': 1.5, 'line-dasharray': LINE_SOLID },
      })
      bindHover('regions-fill', 'regions', (p) => {
        const code = String(p.Region ?? '')
        const total = (Number(p.px_type1) || 0) + (Number(p.px_type2) || 0)
        return `<strong>${REGION_NAMES[code] ?? code}</strong><br/>${total.toLocaleString()} px detected`
      })

      const provinceGeo = await fetch(`${BASE}data/province_stats.geojson`).then((r) => r.json())
      provinceGeoRef.current = provinceGeo
      map.addSource('provinces', { type: 'geojson', data: provinceGeo, promoteId: 'PROV_CODE' })
      map.addLayer({
        id: 'province-fill',
        type: 'fill',
        source: 'provinces',
        layout: { visibility: 'none' },
        paint: {
          'fill-color': '#ffffff',
          'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.14, 0],
        },
      })
      map.addLayer({
        id: 'province-line',
        type: 'line',
        source: 'provinces',
        layout: { visibility: 'none' },
        paint: { 'line-color': '#ffffff', 'line-width': 1.2, 'line-dasharray': LINE_DASHED },
      })
      bindHover(
        'province-fill', 'provinces',
        (p) => {
          const total = (Number(p.px_type1) || 0) + (Number(p.px_type2) || 0)
          return `<strong>${p.PROV_NAM_E}</strong><br/>${total.toLocaleString()} px detected`
        },
        (p) => onHoverProvinceRef.current(p ? String(p.PROV_CODE ?? '') : ''),
      )

      // Dashboard-driven hover indicator (e.g. Top 5 provinces bar chart) — always
      // rendered regardless of drill-down level, so pointing at the chart shows the
      // province on the map even before its region has been selected.
      map.addLayer({
        id: 'province-hover-fill',
        type: 'fill',
        source: 'provinces',
        filter: ['==', ['get', 'PROV_CODE'], -1],
        paint: { 'fill-color': '#5eead4', 'fill-opacity': 0.22 },
      })
      map.addLayer({
        id: 'province-hover-line',
        type: 'line',
        source: 'provinces',
        filter: ['==', ['get', 'PROV_CODE'], -1],
        paint: { 'line-color': '#5eead4', 'line-width': 2.5 },
      })

      map.addSource('boundary-source', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, promoteId: 'AMP_CODE' })
      map.addLayer({
        id: 'boundary-fill',
        type: 'fill',
        source: 'boundary-source',
        layout: { visibility: 'none' },
        paint: {
          'fill-color': '#ffffff',
          'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.14, 0],
        },
      })
      map.addLayer({
        id: 'boundary-line',
        type: 'line',
        source: 'boundary-source',
        layout: { visibility: 'none' },
        paint: { 'line-color': '#ffffff', 'line-width': 1.2, 'line-dasharray': LINE_DASHED },
      })
      bindHover(
        'boundary-fill', 'boundary-source',
        (p) => {
          const total = (Number(p.px_type1) || 0) + (Number(p.px_type2) || 0)
          return `<strong>${p.AMPHOE_E}</strong><br/>${p.PROV_NAM_E}<br/>${total.toLocaleString()} px detected`
        },
        (p) => onHoverDistrictRef.current(p ? String(p.AMP_CODE ?? '') : ''),
      )

      // Dashboard-driven hover indicator for the Top districts (amphoe) chart —
      // same pattern as the province hover overlay above.
      map.addLayer({
        id: 'district-hover-fill',
        type: 'fill',
        source: 'boundary-source',
        filter: ['==', ['get', 'AMP_CODE'], '__none__'],
        paint: { 'fill-color': '#5eead4', 'fill-opacity': 0.22 },
      })
      map.addLayer({
        id: 'district-hover-line',
        type: 'line',
        source: 'boundary-source',
        filter: ['==', ['get', 'AMP_CODE'], '__none__'],
        paint: { 'line-color': '#5eead4', 'line-width': 2.5 },
      })

      // --- Name labels — collision detection keeps these from getting cluttered ---
      map.addLayer({
        id: 'province-label',
        type: 'symbol',
        source: 'provinces',
        layout: {
          visibility: 'none',
          'text-field': ['get', 'PROV_NAM_E'],
          'text-size': 11,
          'symbol-sort-key': ['-', 0, ['coalesce', ['get', 'area_tot'], 0]],
        },
        paint: { 'text-color': '#ffffff', 'text-halo-color': '#0b1220', 'text-halo-width': 1.2 },
      })
      map.addLayer({
        id: 'amphoe-label',
        type: 'symbol',
        source: 'boundary-source',
        layout: {
          visibility: 'none',
          'text-field': ['get', 'AMPHOE_E'],
          'text-size': 10,
          'symbol-sort-key': ['-', 0, ['coalesce', ['get', 'area_tot'], 0]],
        },
        paint: { 'text-color': '#ffffff', 'text-halo-color': '#0b1220', 'text-halo-width': 1.2 },
      })

      map.addSource('cases', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({
        id: 'cases-circle',
        type: 'circle',
        source: 'cases',
        layout: { visibility: 'none' },
        paint: { 'circle-radius': 8, 'circle-color': '#38bdf8', 'circle-stroke-width': 2, 'circle-stroke-color': '#001018' },
      })
      map.addLayer({
        id: 'cases-label',
        type: 'symbol',
        source: 'cases',
        layout: {
          visibility: 'none',
          'text-field': [
            'match', ['get', 'case_name'],
            'point_1', 'Case study 1',
            'point_4', 'Case study 2',
            'point_5', 'Case study 3',
            ['get', 'case_name'],
          ],
          'text-size': 12,
          'text-offset': [0, 1.4],
        },
        paint: { 'text-color': '#e7ecf7', 'text-halo-color': '#0b1220', 'text-halo-width': 1.2 },
      })
      map.on('click', 'cases-circle', (e: maplibregl.MapLayerMouseEvent) => {
        const name = e.features?.[0]?.properties?.case_name as string | undefined
        if (name) onSelectCaseRef.current(name)
      })
      map.on('mouseenter', 'cases-circle', () => (map.getCanvas().style.cursor = 'pointer'))
      map.on('mouseleave', 'cases-circle', () => (map.getCanvas().style.cursor = ''))

      // Pixel raster draws above every vector layer, so the classification is never
      // obscured by boundary fills/lines/labels.
      map.moveLayer('province-type-layer')
      map.moveLayer('province-bivariate-layer')

      // Single click router — replaces separate per-layer click handlers so exactly
      // one outcome happens per click (two independent map.on('click', layerId, ...)
      // registrations would otherwise both fire for the same click and fight each
      // other). Checked in order:
      //  1. On a bubble marker -> its own onclick already owns this (drills straight
      //     down). Skip entirely: MapLibre's synthetic click can fire a tick after the
      //     marker's native click already updated React state, so re-reading refs here
      //     would race against state the click itself just changed.
      //  2. Outside the current boundary (hits the dimming mask) -> step back one level.
      //  3. On a still-drillable sub-area -> navigate into it.
      map.on('click', (e: maplibregl.MapMouseEvent) => {
        const target = e.originalEvent?.target as HTMLElement | null
        if (target?.closest?.('.bubble-marker')) return

        if (map.queryRenderedFeatures(e.point, { layers: ['mask-layer'] }).length > 0) {
          onClickOutsideRef.current()
          return
        }

        if (districtCodeRef.current === '') {
          if (provinceCodeRef.current !== '') {
            const props = map.queryRenderedFeatures(e.point, { layers: ['boundary-fill'] })[0]?.properties as
              | AmphoeProps
              | undefined
            if (props) onSelectDistrictRef.current(props.AMP_CODE)
          } else if (regionCodeRef.current !== '') {
            const props = map.queryRenderedFeatures(e.point, { layers: ['province-fill'] })[0]?.properties as
              | ProvinceProps
              | undefined
            if (props) onSelectProvinceRef.current(String(props.PROV_CODE))
          } else {
            const region = map.queryRenderedFeatures(e.point, { layers: ['regions-fill'] })[0]?.properties
              ?.Region as string | undefined
            if (region) onSelectRegionRef.current(region)
          }
        }
      })

      // Double-click to read the coordinate under the cursor — e.g. to pinpoint an
      // abandoned-land pixel. Kept off the default double-click-zoom so it doesn't
      // fight with pixel inspection.
      map.doubleClickZoom.disable()
      const coordPopup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, className: 'coord-popup' })
      map.on('dblclick', (e: maplibregl.MapMouseEvent) => {
        const target = e.originalEvent?.target as HTMLElement | null
        if (target?.closest?.('.bubble-marker')) return
        coordPopup
          .setLngLat(e.lngLat)
          .setHTML(`<strong>📍 Coordinates</strong><br/>${e.lngLat.lat.toFixed(6)}, ${e.lngLat.lng.toFixed(6)}`)
          .addTo(map)
      })

      setMapLoaded(true)
    })

    return () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      popup.remove()
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cluster bubbles (pixel-count totals) for whichever level is currently being
  // browsed: regions nationally, provinces within a region, or amphoes within a
  // province — so the "how much is where" cue never disappears as you drill down.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return

    function addBubbles(
      items: { code: string; label: string; coord: [number, number]; total: number; onClick: () => void }[],
    ) {
      if (!map) return
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      if (items.length === 0) return

      const maxTotal = Math.max(...items.map((i) => i.total), 1)
      const sorted = [...items].sort((a, b) => b.total - a.total) // biggest first -> rendered underneath

      sorted.forEach((item) => {
        const size = 26 + (item.total / maxTotal) * 46
        const el = document.createElement('div')
        el.className = 'bubble-marker'
        el.style.width = `${size}px`
        el.style.height = `${size}px`
        el.innerHTML = `<div class="bubble-label">${item.label}</div><div class="bubble-value">${(item.total / 1000).toFixed(1)}k</div>`
        el.onclick = item.onClick
        const marker = new maplibregl.Marker({ element: el }).setLngLat(item.coord).addTo(map)
        markersRef.current.push(marker)
      })
    }

    async function rebuild() {
      if (regionCode === '') {
        const centroids: Record<string, [number, number]> = await fetch(`${BASE}data/region_centroids.json`).then((r) => r.json())
        const totals = new Map<string, number>()
        for (const f of nationalFeatures) {
          totals.set(f.properties.Region, (totals.get(f.properties.Region) ?? 0) + f.properties.px_type1 + f.properties.px_type2)
        }
        addBubbles(
          Object.entries(centroids).map(([code, coord]) => ({
            code,
            label: code,
            coord,
            total: totals.get(code) ?? 0,
            onClick: () => onSelectRegionRef.current(code),
          })),
        )
      } else if (provinceCode === '') {
        const provinceGeo = await fetch(`${BASE}data/province_stats.geojson`).then((r) => r.json())
        const feats = (provinceGeo.features as GeoJSON.Feature[]).filter((f) => f.properties?.Region === regionCode)
        addBubbles(
          feats.flatMap((f) => {
            const c = featureCentroid(f.geometry)
            const p = f.properties as { PROV_CODE: number; PROV_NAM_E: string; px_type1: number; px_type2: number }
            return c
              ? [{
                  code: String(p.PROV_CODE),
                  label: p.PROV_NAM_E,
                  coord: c,
                  total: p.px_type1 + p.px_type2,
                  onClick: () => onSelectProvinceRef.current(String(p.PROV_CODE)),
                }]
              : []
          }),
        )
      } else if (districtCode === '') {
        addBubbles(
          boundaryFeatures.flatMap((f) => {
            const c = featureCentroid(f.geometry)
            const p = f.properties
            return c
              ? [{
                  code: p.AMP_CODE,
                  label: p.AMPHOE_E,
                  coord: c,
                  total: p.px_type1 + p.px_type2,
                  onClick: () => onSelectDistrictRef.current(p.AMP_CODE),
                }]
              : []
          }),
        )
      } else {
        addBubbles([])
      }
    }

    rebuild()
  }, [regionCode, provinceCode, districtCode, boundaryFeatures, nationalFeatures, mapLoaded])

  // Reflect dashboard-driven hover (e.g. the Top 5 provinces bar chart) onto the
  // map's province fill, so pointing at either side highlights the other.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return

    if (externalHoverRef.current !== null) {
      map.setFeatureState({ source: 'provinces', id: externalHoverRef.current }, { hover: false })
      externalHoverRef.current = null
    }
    const code = hoveredProvince ? Number(hoveredProvince) : -1
    map.setFilter('province-hover-fill', ['==', ['get', 'PROV_CODE'], code])
    map.setFilter('province-hover-line', ['==', ['get', 'PROV_CODE'], code])
    if (hoveredProvince) {
      map.setFeatureState({ source: 'provinces', id: code }, { hover: true })
      externalHoverRef.current = code
    }
  }, [hoveredProvince, mapLoaded])

  // Same, but for the Top districts (amphoe) chart against the current boundary source.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return

    if (externalHoverDistrictRef.current !== null) {
      map.setFeatureState({ source: 'boundary-source', id: externalHoverDistrictRef.current }, { hover: false })
      externalHoverDistrictRef.current = null
    }
    const code = hoveredDistrict || '__none__'
    map.setFilter('district-hover-fill', ['==', ['get', 'AMP_CODE'], code])
    map.setFilter('district-hover-line', ['==', ['get', 'AMP_CODE'], code])
    if (hoveredDistrict) {
      map.setFeatureState({ source: 'boundary-source', id: hoveredDistrict }, { hover: true })
      externalHoverDistrictRef.current = hoveredDistrict
    }
  }, [hoveredDistrict, mapLoaded])

  // Apply the active basemap selection.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return
    for (const opt of BASEMAP_OPTIONS) {
      map.setLayoutProperty(opt.layerId, 'visibility', opt.id === basemap ? 'visible' : 'none')
    }
  }, [basemap, mapLoaded])

  // Switch layer visibility/filters whenever the drill-down level
  // (region/province/district) or a display toggle changes.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return

    const setVis = (id: string, visible: boolean) =>
      map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none')

    const hasRegion = regionCode !== ''
    const hasProvince = provinceCode !== ''
    const linesOn = showBoundaryLines

    setVis('regions-fill', !hasRegion)
    setVis('regions-line', linesOn)
    map.setFilter('regions-line', hasRegion ? ['==', ['get', 'Region'], regionCode] : null)

    setVis('province-fill', hasRegion && linesOn)
    setVis('province-line', hasRegion && linesOn)
    setVis('province-label', hasRegion)
    if (hasRegion) {
      map.setFilter('province-fill', ['==', ['get', 'Region'], regionCode])
      map.setFilter('province-line', ['==', ['get', 'Region'], regionCode])
      map.setFilter('province-label', ['==', ['get', 'Region'], regionCode])
    }
    map.setPaintProperty('province-line', 'line-width', [
      'case', ['==', ['to-string', ['get', 'PROV_CODE']], provinceCode], 2.5, 1.2,
    ])
    map.setPaintProperty('province-line', 'line-dasharray', [
      'case', ['==', ['to-string', ['get', 'PROV_CODE']], provinceCode], ['literal', LINE_SOLID], ['literal', LINE_DASHED],
    ])

    setVis('boundary-fill', hasProvince && linesOn)
    setVis('boundary-line', hasProvince && linesOn)
    setVis('amphoe-label', hasProvince)
    map.setPaintProperty('boundary-line', 'line-width', [
      'case', ['==', ['get', 'AMP_CODE'], districtCode], 2.5, 1.2,
    ])
    map.setPaintProperty('boundary-line', 'line-dasharray', [
      'case', ['==', ['get', 'AMP_CODE'], districtCode], ['literal', LINE_SOLID], ['literal', LINE_DASHED],
    ])

    setVis('cases-circle', showAnalysis)
    setVis('cases-label', showAnalysis)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionCode, provinceCode, districtCode, showBoundaryLines, showAnalysis, showPixelRaster, mapLoaded])

  // Dim everything outside the currently selected boundary so it stands out —
  // district is most specific, then province, then region; nothing selected = no dim.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return
    const source = map.getSource('mask') as maplibregl.GeoJSONSource | undefined
    if (!source) return

    let geoms: GeoJSON.Geometry[] = []
    if (districtCode !== '') {
      geoms = boundaryFeatures.filter((f) => f.properties.AMP_CODE === districtCode).map((f) => f.geometry)
    } else if (provinceCode !== '') {
      geoms = (provinceGeoRef.current?.features ?? [])
        .filter((f) => String((f.properties as { PROV_CODE?: number })?.PROV_CODE) === provinceCode)
        .map((f) => f.geometry)
    } else if (regionCode !== '') {
      geoms = (regionGeoRef.current?.features ?? [])
        .filter((f) => (f.properties as { Region?: string })?.Region === regionCode)
        .map((f) => f.geometry)
    }

    if (geoms.length === 0) {
      map.setLayoutProperty('mask-layer', 'visibility', 'none')
    } else {
      source.setData(buildSpotlightMask(geoms))
      map.setLayoutProperty('mask-layer', 'visibility', 'visible')
    }
  }, [regionCode, provinceCode, districtCode, boundaryFeatures, mapLoaded])

  // Move the camera on genuine navigation (scene/drill-down changes) only — never
  // just because a display toggle (Analysis, boundary lines) flipped.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return

    if (regionCode === '') {
      map.flyTo({ center: NATIONAL_VIEW.center, zoom: NATIONAL_VIEW.zoom, duration: 900 })
    } else {
      const bounds = collectBounds(boundaryFeatures)
      if (bounds) map.fitBounds(bounds, { padding: 30, duration: 900 })
      else map.flyTo({ center: BOUNDARY_DEFAULT_VIEW.center, zoom: BOUNDARY_DEFAULT_VIEW.zoom, duration: 900 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionCode, provinceCode, districtCode, mapLoaded])

  // Keep the amphoe boundary source in sync with the current filter, and re-fit while viewing it.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return
    const source = map.getSource('boundary-source') as maplibregl.GeoJSONSource | undefined
    source?.setData({ type: 'FeatureCollection', features: boundaryFeatures })
    if (regionCode !== '') {
      const bounds = collectBounds(boundaryFeatures)
      if (bounds) map.fitBounds(bounds, { padding: 30, duration: 600 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundaryFeatures, mapLoaded])

  // Load the pixel-level classification raster for the selected province (Boundary
  // view) and the finer per-province bivariate clip (Analysis view), when available.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return

    async function applyProvinceRaster(dataDir: string, sourceId: string, layerId: string, show: boolean) {
      const map2 = mapRef.current
      if (!map2) return
      if (!show) {
        map2.setLayoutProperty(layerId, 'visibility', 'none')
        return
      }
      try {
        const bounds: RasterBounds = await fetch(`${BASE}data/${dataDir}/${provinceCode}.json`).then((r) => {
          if (!r.ok) throw new Error('not found')
          return r.json()
        })
        const source = map2.getSource(sourceId) as maplibregl.ImageSource | undefined
        source?.updateImage({ url: `${BASE}data/${dataDir}/${provinceCode}.png`, coordinates: boundsToCoords(bounds) })
        map2.setLayoutProperty(layerId, 'visibility', 'visible')
      } catch {
        map2.setLayoutProperty(layerId, 'visibility', 'none')
      }
    }

    applyProvinceRaster(
      'province_type', 'province-type', 'province-type-layer',
      !showAnalysis && provinceCode !== '' && showPixelRaster,
    )
    applyProvinceRaster(
      'province_bivariate', 'province-bivariate', 'province-bivariate-layer',
      showAnalysis && provinceCode !== '' && showPixelRaster,
    )
  }, [provinceCode, showAnalysis, showPixelRaster, mapLoaded])

  // Keep case-study markers in sync with the current filter.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return
    const source = map.getSource('cases') as maplibregl.GeoJSONSource | undefined
    source?.setData({ type: 'FeatureCollection', features: caseFeatures })
  }, [caseFeatures, mapLoaded])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <div className="basemap-picker">
        {BASEMAP_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            className={`basemap-btn ${basemap === opt.id ? 'active' : ''}`}
            onClick={() => pickBasemap(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default ExploreMap
