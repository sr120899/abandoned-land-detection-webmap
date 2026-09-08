import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const BASE = import.meta.env.BASE_URL

interface Props {
  lon: number
  lat: number
  label: string
  provCode: string
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

// Frames the local pixel cluster around the point (~650m across) — small enough
// that the classification patch reads clearly, without needing to pan or zoom.
const LOCK_BUFFER = 0.006

function LocationMiniMap({ lon, lat, label, provCode }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          basemap: {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            attribution: 'Esri World Imagery',
          },
        },
        layers: [{ id: 'basemap', type: 'raster', source: 'basemap' }],
      },
      center: [lon, lat],
      zoom: 15,
      interactive: false, // locked framing — the point is what matters here, not free pan/zoom
      attributionControl: false,
    })
    mapRef.current = map

    map.on('load', async () => {
      map.fitBounds(
        [
          [lon - LOCK_BUFFER, lat - LOCK_BUFFER],
          [lon + LOCK_BUFFER, lat + LOCK_BUFFER],
        ],
        { padding: 0, duration: 0 },
      )

      try {
        // Same layer the main map shows in Analysis mode — case studies only ever
        // open from there, so this always matches what the analyst was just looking at.
        const bounds: RasterBounds = await fetch(`${BASE}data/province_bivariate/${provCode}.json`).then((r) => {
          if (!r.ok) throw new Error('not found')
          return r.json()
        })
        map.addSource('bivariate-raster', {
          type: 'image',
          url: `${BASE}data/province_bivariate/${provCode}.png`,
          coordinates: boundsToCoords(bounds),
        })
        map.addLayer({
          id: 'bivariate-raster-layer',
          type: 'raster',
          source: 'bivariate-raster',
          // Fully opaque — must render exactly as legended, not blended with the basemap.
          paint: { 'raster-opacity': 1, 'raster-resampling': 'nearest' },
        })
      } catch {
        // no pixel classification available for this province — plain basemap + pin is fine
      }

      const el = document.createElement('div')
      el.className = 'mini-map-pin'
      el.innerHTML = `<span>${label}</span>`
      new maplibregl.Marker({ element: el }).setLngLat([lon, lat]).addTo(map)
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lon, lat, label, provCode])

  return (
    <div className="mini-map-wrap">
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <span className="mini-map-caption">Probability × Duration</span>
    </div>
  )
}

export default LocationMiniMap
