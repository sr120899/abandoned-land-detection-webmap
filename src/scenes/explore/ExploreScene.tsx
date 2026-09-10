import './ExploreVisual.css'
import LineIcon from '../../components/LineIcon'
import { Fragment, forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Doughnut, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js'
import { useBoundaryData, aggregate, topProvinces, REGION_NAMES } from '../../hooks/useBoundaryData'
import type { AmphoeFeature } from '../../hooks/useBoundaryData'
import ExploreMap from './ExploreMap'
import EvidenceSheet from './EvidenceSheet'
import { BIV_COLORS, bivClassId } from '../../utils/bivariateColors'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const BASE = import.meta.env.BASE_URL

function TypeDoughnut({ pxType1, pxType2, pct1, pct2 }: { pxType1: number; pxType2: number; pct1: number; pct2: number }) {
  const data = {
    labels: ['C1 Abandoned field crops', 'C2 Shrub encroachment'],
    datasets: [
      {
        data: [pxType1, pxType2],
        backgroundColor: ['#a3e635', '#38bdf8'],
        borderColor: '#051e2b',
        borderWidth: 2,
      },
    ],
  }
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { label: string; raw: unknown }) => `${ctx.label}: ${Number(ctx.raw).toLocaleString()} px`,
        },
      },
    },
  }
  return (
    <div className="doughnut-row">
      <div className="doughnut-wrap">
        <Doughnut data={data} options={options} />
      </div>
      <div className="doughnut-legend">
        <div><span className="dot" style={{ background: '#a3e635' }} /> C1 · {pct1.toFixed(1)}%</div>
        <div><span className="dot" style={{ background: '#38bdf8' }} /> C2 · {pct2.toFixed(1)}%</div>
      </div>
    </div>
  )
}

interface RankedBarProps {
  data: { code: string; name: string; area: number }[]
  hovered: string
  onHover: (code: string) => void
  onSelect: (code: string) => void
}

function RankedBar({ data, hovered, onHover, onSelect }: RankedBarProps) {
  const chartData = {
    labels: data.map((d) => d.name),
    datasets: [
      {
        data: data.map((d) => d.area),
        backgroundColor: data.map((d) => (d.code === hovered ? '#fde68a' : '#facc15')),
        hoverBackgroundColor: '#fde68a',
        borderRadius: 4,
        barThickness: 14,
      },
    ],
  }
  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    onHover: (_evt: unknown, elements: { index: number }[]) => {
      onHover(elements.length ? data[elements[0].index].code : '')
    },
    onClick: (_evt: unknown, elements: { index: number }[]) => {
      if (elements.length) onSelect(data[elements[0].index].code)
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { raw: unknown }) => `${Number(ctx.raw).toLocaleString(undefined, { maximumFractionDigits: 2 })} rai`,
        },
      },
    },
    scales: {
      x: { ticks: { color: '#acc1cf', font: { size: 9.5 } }, grid: { color: '#1b4657' } },
      y: { ticks: { color: '#acc1cf', font: { size: 10.5 } }, grid: { display: false } },
    },
  }
  return (
    <div className="bar-chart-wrap" style={{ height: `${data.length * 30 + 20}px`, cursor: 'pointer' }}>
      <Bar data={chartData} options={options} />
    </div>
  )
}

interface BivariateRow {
  class_id: number
  probability: string
  duration: string
  pixel_count: number
  area_rai: number
}

export interface ExploreSceneHandle {
  /** Undo one level of drill-down (district -> province -> region -> analysis off). Returns
   *  true if something was undone, false if there was nothing left to undo. */
  goBack: () => boolean
}

const DASHBOARD_MIN = 320
const DASHBOARD_MAX = 960
// Dashboard gets the majority of the width by default — the map is the
// supporting view here, the numbers are the point.
function defaultDashboardWidth(): number {
  if (typeof window === 'undefined') return 620
  return Math.round(Math.min(DASHBOARD_MAX, Math.max(420, window.innerWidth * 0.44)))
}

const ExploreScene = forwardRef<ExploreSceneHandle>(function ExploreScene(_props, ref) {
  const { features } = useBoundaryData()
  const [region, setRegion] = useState<string>('')
  const [province, setProvince] = useState<string>('')
  const [district, setDistrict] = useState<string>('')
  const [layer, setLayer] = useState<'classes' | 'analysis'>('classes')
  const [bivariateResult, setBivariate] = useState<{ key: string; rows: BivariateRow[] }>({ key: '', rows: [] })
  const bivariateKey = `${region}/${province}/${district}`
  const bivariate = useMemo(() => bivariateResult.key === bivariateKey ? bivariateResult.rows : [], [bivariateResult, bivariateKey])
  const [caseFeatures, setCaseFeatures] = useState<GeoJSON.Feature[]>([])
  const [selectedCase, setSelectedCase] = useState<string>('point_4')
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const [showClusters, setShowClusters] = useState(true)
  const [showBoundaryLines, setShowBoundaryLines] = useState(true)
  const [showPixelRaster, setShowPixelRaster] = useState(true)
  const [hoveredProvince, setHoveredProvince] = useState('')
  const [hoveredDistrict, setHoveredDistrict] = useState('')
  const [dashboardWidth, setDashboardWidth] = useState(defaultDashboardWidth)
  const draggingRef = useRef(false)

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!draggingRef.current) return
      const newWidth = window.innerWidth - e.clientX
      setDashboardWidth(Math.min(DASHBOARD_MAX, Math.max(DASHBOARD_MIN, newWidth)))
    }
    function onUp() {
      draggingRef.current = false
      document.body.style.cursor = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  function startResize() {
    draggingRef.current = true
    document.body.style.cursor = 'col-resize'
  }

  useEffect(() => {
    fetch(`${BASE}data/case_studies.geojson`).then((r) => r.json()).then((fc: GeoJSON.FeatureCollection) => setCaseFeatures(fc.features))
  }, [])

  // Probability × Duration breakdown for whichever boundary is currently selected —
  // per-amphoe if drilled to a district, per-province, or the Central-wide default.
  useEffect(() => {
    if (region !== 'C') return
    const url = district
      ? `${BASE}data/bivariate_by_amphoe/${province}/${district}.json`
      : province
        ? `${BASE}data/bivariate_by_province/${province}.json`
        : `${BASE}data/bivariate_legend_C.json`
    let cancelled = false
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then((rows: BivariateRow[]) => {
        if (!cancelled) setBivariate({ key: bivariateKey, rows })
      })
      .catch(() => {
        if (!cancelled) setBivariate({ key: bivariateKey, rows: [] })
      })
    return () => {
      cancelled = true
    }
  }, [region, province, district, bivariateKey])

  const highLongCell = useMemo(() => bivariate.find((b) => b.class_id === 9), [bivariate])

  const filtered: AmphoeFeature[] = useMemo(() => {
    return features.filter((f) => {
      if (region && f.properties.Region !== region) return false
      if (province && String(f.properties.PROV_CODE) !== province) return false
      if (district && f.properties.AMP_CODE !== district) return false
      return true
    })
  }, [features, region, province, district])

  const agg = useMemo(() => aggregate(filtered), [filtered])
  const top5 = useMemo(() => topProvinces(filtered, 5), [filtered])
  const topAmphoe = useMemo(
    () =>
      [...filtered]
        .sort((a, b) => b.properties.area_aban - a.properties.area_aban)
        .slice(0, 5)
        .map((f) => ({ code: f.properties.AMP_CODE, name: f.properties.AMPHOE_E, area: f.properties.area_aban })),
    [filtered],
  )

  const provinceOptions = useMemo(() => {
    const map = new Map<string, string>()
    features.forEach((f) => {
      if (!region || f.properties.Region === region) map.set(String(f.properties.PROV_CODE), f.properties.PROV_NAM_E)
    })
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [features, region])

  const districtOptions = useMemo(() => {
    if (!province) return []
    return features
      .filter((f) => String(f.properties.PROV_CODE) === province)
      .map((f) => [f.properties.AMP_CODE, f.properties.AMPHOE_E] as [string, string])
      .sort((a, b) => a[1].localeCompare(b[1]))
  }, [features, province])

  function selectRegion(r: string) {
    setRegion(r)
    if (r !== 'C') setLayer('classes')
    setProvince('')
    setDistrict('')
  }

  function selectProvince(provCode: string) {
    if (!region) {
      const f = features.find((f) => String(f.properties.PROV_CODE) === provCode)
      if (f) setRegion(f.properties.Region)
    }
    setProvince(provCode)
    setDistrict('')
  }

  function selectDistrict(ampCode: string) {
    setDistrict(ampCode)
  }

  function toggleLayer(next: 'classes' | 'analysis') {
    if (next === 'analysis' && region !== 'C') return
    setLayer(next)
    setShowPixelRaster(true)
  }

  function clearFilters() {
    setRegion('')
    setProvince('')
    setDistrict('')
    setLayer('classes')
  }

  const hasActiveFilters = region !== '' || province !== '' || district !== ''

  function stepBack(): boolean {
    if (district) { setDistrict(''); return true }
    if (province) { setProvince(''); return true }
    if (region) { setRegion(''); setLayer('classes'); return true }
    if (layer !== 'classes') { setLayer('classes'); return true }
    return false
  }

  useImperativeHandle(ref, () => ({ goBack: stepBack }))

  const casesInBoundary = useMemo(() => caseFeatures.filter((f) => {
    const p = f.properties as { region?: string; prov_code?: number; amp_code?: string }
    if (region && p.region !== region) return false
    if (province && String(p.prov_code) !== province) return false
    if (district && p.amp_code !== district) return false
    return true
  }), [caseFeatures, region, province, district])

  function openSelectedCase() {
    if (!casesInBoundary.length) return
    setEvidenceOpen(true)
  }

  const dashboardTitle = district
    ? districtOptions.find(([code]) => code === district)?.[1] ?? 'Selected district'
    : province
      ? provinceOptions.find(([code]) => code === province)?.[1] ?? 'Selected province'
      : region
        ? REGION_NAMES[region] ?? region
        : 'Thailand'

  return (
    <div className="explore-layout">
      <aside className="explore-sidebar">
        <h1 className="explore-sr-only">Explore abandoned land</h1>
        <div className="breadcrumb-mini">
          Thailand
          {region && <> &gt; {REGION_NAMES[region] ?? region}</>}
          {province && <> &gt; {provinceOptions.find(([code]) => code === province)?.[1] ?? province}</>}
          {district && <> &gt; {districtOptions.find(([code]) => code === district)?.[1] ?? district}</>}
        </div>

        <div className="sidebar-section-label">FILTERS</div>
        <label className="sidebar-label" htmlFor="filter-region">Region</label>
        <select
          id="filter-region"
          value={region}
          onChange={(e) => {
            setRegion(e.target.value)
            if (e.target.value !== 'C') setLayer('classes')
            setProvince('')
            setDistrict('')
          }}
        >
          <option value="">All regions</option>
          {Object.entries(REGION_NAMES).map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>

        <label className="sidebar-label" htmlFor="filter-province">Province</label>
        <select
          id="filter-province"
          value={province}
          disabled={!region}
          onChange={(e) => {
            setProvince(e.target.value)
            setDistrict('')
          }}
        >
          <option value="">All</option>
          {provinceOptions.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>

        <label className="sidebar-label" htmlFor="filter-district">District</label>
        <select id="filter-district" value={district} disabled={!province} onChange={(e) => setDistrict(e.target.value)}>
          <option value="">All</option>
          {districtOptions.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>

        <button className="clear-filters-btn" disabled={!hasActiveFilters} onClick={clearFilters}>
          ✕ Clear filters
        </button>

        <div className="sidebar-section-label" style={{ marginTop: 20 }}>
          LAYERS
        </div>
        <label className="layer-checkbox">
          <input type="checkbox" checked={showPixelRaster} onChange={(e) => setShowPixelRaster(e.target.checked)} />
          Raster overlay
        </label>
        <label className="layer-checkbox">
          <input type="checkbox" checked={showBoundaryLines} onChange={(e) => setShowBoundaryLines(e.target.checked)} />
          Boundary lines
        </label>
        <label className="layer-checkbox" title={layer === 'analysis' ? 'Clusters are hidden in Evidence view' : ''}><input type="checkbox" checked={showClusters} disabled={layer === 'analysis'} onChange={e => setShowClusters(e.target.checked)} />Cluster composition</label>

        <div className="sidebar-section-label" style={{ marginTop: 20 }}>
          MAP LEGEND
        </div>
        <div className="legend-list">
          <div className="legend-item"><span className="legend-swatch" style={{ background: '#a3e635' }} /> C1 &mdash; Abandoned field crops</div>
          <div className="legend-item"><span className="legend-swatch" style={{ background: '#38bdf8' }} /> C2 &mdash; Shrub encroachment</div>
          <div className="legend-overlay-status">Raster: {layer === 'classes' ? 'TYPE (C1 / C2)' : 'EVIDENCE (Probability x Duration)'}{!showPixelRaster && ' - hidden'}</div>
          {region === 'C' && <div className="evidence-map-legend">
            <h3>EVIDENCE COLORS</h3><p>Probability (%) by duration (years)</p>
            <div className="evidence-legend-matrix"><span /><span>&gt;0&ndash;&lt;3</span><span>3&ndash;&lt;5</span><span>&ge;5</span>
              {['\u226575%', '50\u2013<75%', '<50%'].map((label, row) => <Fragment key={label}><span>{label}</span>{[0, 1, 2].map(col => <i key={col} style={{ background: BIV_COLORS[bivClassId(row, col)] }} role="img" aria-label={label + ' probability; ' + ['over 0 to under 3', '3 to under 5', '5 or more'][col] + ' years'} />)}</Fragment>)}
            </div><p>Yellow: probability &ge;75%, duration &ge;5 years.</p>
          </div>}
          <div className="legend-item"><span className="legend-line solid" /> Selected boundary</div>
          <div className="legend-item"><span className="legend-line hovered" /> Hovered area</div>
          {region === 'C' && <div className="legend-item"><span className="case-legend-dot" /> Case-study location</div>}
          <p className="legend-footnote">Transparent raster areas have no displayed classification.</p>
          <div className="legend-item"><span className="legend-line dashed" /> Sub-areas — click to drill in</div>
          {layer === 'classes' && <div className="cluster-key"><span className="cluster-key-ring" /><span>Circle size = detected pixels<br />Ring color = C1 / C2 share</span></div>}
        </div>

        <p className="stat-sub" style={{ marginTop: 20 }}>Filters update map + dashboard</p>
      </aside>

      <div className="explore-main">
        <div className="explore-map">
<div className="map-display-tabs" aria-label="Raster overlay">
            <button className={layer === 'classes' ? 'active' : ''} aria-pressed={layer === 'classes'} onClick={() => toggleLayer('classes')}>TYPE</button>
            <button
              className={layer === 'analysis' ? 'active' : ''}
              aria-pressed={layer === 'analysis'}
              disabled={region !== 'C'}
              title={region !== 'C' ? 'Probability x Duration raster available for Central only' : ''}
              onClick={() => toggleLayer('analysis')}
            >
              EVIDENCE
            </button>
          </div>
          <button className="map-home" aria-label="Reset map to Thailand" onClick={clearFilters}><LineIcon name="pin" /></button>
          <ExploreMap
            nationalFeatures={features}
            boundaryFeatures={filtered}
            caseFeatures={casesInBoundary}
            regionCode={region}
            provinceCode={province}
            districtCode={district}
            showBoundaryLines={showBoundaryLines}
            showPixelRaster={showPixelRaster}
            showClusters={showClusters}
            showAnalysis={layer === 'analysis'}
            showAbandoned={false}
            hoveredProvince={hoveredProvince}
            hoveredDistrict={hoveredDistrict}
            onSelectRegion={selectRegion}
            onSelectProvince={selectProvince}
            onSelectDistrict={selectDistrict}
            onSelectCase={setSelectedCase}
            onHoverProvince={setHoveredProvince}
            onHoverDistrict={setHoveredDistrict}
            onClickOutside={stepBack}
          />
        </div>

        <div className="explore-resizer" onMouseDown={startResize} />

        <aside className="explore-dashboard" style={{ '--dash-w': `${dashboardWidth}px` } as CSSProperties}>

          <div className="total-card">
                <div className="extent-label">SELECTED EXTENT</div><div className="extent-title">{dashboardTitle}</div>
                <div className="extent-steps" aria-label="Exploration depth">{['Thailand', 'Region', 'Province', 'District'].map((label, index) => <span key={label} className={index === (district ? 3 : province ? 2 : region ? 1 : 0) ? 'active' : ''}><b>{index + 1}</b><small>{label}</small></span>)}</div>
                <div className="stat-sub">{district || province || region ? 'C1 + C2 · nominal 30m estimate' : 'Model output / Thailand'}</div>
                <div className="big-number">{agg.pxTotal.toLocaleString()} px <small>(&asymp; {agg.areaAban.toLocaleString(undefined, { maximumFractionDigits: 2 })} rai)</small></div>
              </div>

              <div className={`type-top-row ${district ? 'district-summary' : ''}`}>
                <div className="dash-col">
                  <div className="panel-title" style={{ marginTop: 16 }}>Type composition</div>
                  <TypeDoughnut pxType1={agg.pxType1} pxType2={agg.pxType2} pct1={agg.pct1} pct2={agg.pct2} />
                </div>
                {!province && (
                  <div className="dash-col">
                    <div className="panel-title" style={{ marginTop: 16 }}>Top 5 provinces (nominal rai)</div>
                    <RankedBar data={top5} hovered={hoveredProvince} onHover={setHoveredProvince} onSelect={selectProvince} />
                  </div>
                )}
                {province && !district && (
                  <div className="dash-col">
                    <div className="panel-title" style={{ marginTop: 16 }}>Top 5 districts (nominal rai)</div>
                    <RankedBar data={topAmphoe} hovered={hoveredDistrict} onHover={setHoveredDistrict} onSelect={selectDistrict} />
                  </div>
                )}
              </div>

              {region === 'C' && (<>
                  <section className="analysis-matrix"><div className="panel-title">Probability &times; Duration <small>Stronger abandonment evidence &#8599;</small></div>
                  <div className="bivariate-grid mini">
                    <div />
                    <div className="axis-label center">&gt;0&ndash;&lt;3 yr</div>
                    <div className="axis-label center">3&ndash;&lt;5 yr</div>
                    <div className="axis-label center">&ge;5 yr</div>
                    {['≥75%', '50–<75%', '<50%'].map((probLabel, rowIdx) => {
                      return (
                        <Fragment key={probLabel}>
                          <div className="axis-label">{probLabel}</div>
                          {[0, 1, 2].map((di) => {
                            const classId = bivClassId(rowIdx, di)
                            const row = bivariate.find((b) => b.class_id === classId)
                            const px = row?.pixel_count ?? 0
                            const rai = row?.area_rai ?? 0
                            return (
                              <div
                                className="cell"
                                key={classId}
                                style={{ background: BIV_COLORS[classId], color: classId === 9 ? '#17231f' : '#ffffff' }}
                                title={`${px.toLocaleString()} px (≈${rai.toLocaleString(undefined, { maximumFractionDigits: 2 })} rai)`}
                              >
                                <span className="cell-value">{row ? px.toLocaleString() : '\u2014'}</span>
                                <span className="cell-sub">{row ? rai.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' rai' : 'No data'}</span>
                              </div>
                            )
                          })}
                        </Fragment>
                      )
                    })}
                  </div>

                  </section>
                  <div className="stat-chip-row" style={{ marginTop: 14 }}>
                    <div className="stat-chip">
                      <div className="metric-label"><LineIcon name="target" /> HIGH EVIDENCE</div>
                      <div className="stat-chip-value good">
                        {highLongCell ? highLongCell.pixel_count.toLocaleString() : '…'} px
                      </div>
                      <div className="stat-chip-sub">
                        High × ≥5yr ≈{highLongCell?.area_rai.toLocaleString(undefined, { maximumFractionDigits: 2 })} rai
                      </div>
                    </div>
                    <div className="stat-chip">
                      <div className="metric-label"><LineIcon name="search" />SELECTED CASE STUDIES</div><div className="stat-chip-value">{casesInBoundary.length}</div><button className="case-open-mini" disabled={!casesInBoundary.length} onClick={openSelectedCase}>OPEN CASE STUDY &rarr;</button>
                    </div>
                  </div>
                </>)}
          <p className="demo-scope-note">Note: This live demo includes Evidence (Probability &times; Duration) analysis and case-study locations for the Central region only. Other regions show Type classification and totals.</p>
        </aside>
      </div>

      {evidenceOpen && (
        <div className="sheet-overlay">
          <EvidenceSheet caseName={selectedCase} onChangeCase={setSelectedCase} onClose={() => setEvidenceOpen(false)} />
        </div>
      )}
    </div>
  )
})

export default ExploreScene
