import './ExploreVisual.css'
import LineIcon from '../../components/LineIcon'
import { Fragment, forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useBoundaryData, REGION_NAMES } from '../../hooks/useBoundaryData'
import type { AmphoeFeature } from '../../hooks/useBoundaryData'
import ExploreMap from './ExploreMap'
import EvidenceSheet from './EvidenceSheet'
import DecisionDashboard from './DecisionDashboard'
import { BIV_COLORS, bivClassId } from '../../utils/bivariateColors'
import { useLanguage } from '../../i18n/LanguageContext'

const BASE = import.meta.env.BASE_URL

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
  const { t } = useLanguage()
  const { features, loading } = useBoundaryData()
  const [region, setRegion] = useState<string>('')
  const [province, setProvince] = useState<string>('')
  const [district, setDistrict] = useState<string>('')
  const [layer, setLayer] = useState<'detected' | 'classes' | 'analysis'>('detected')
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

  const filtered: AmphoeFeature[] = useMemo(() => {
    return features.filter((f) => {
      if (region && f.properties.Region !== region) return false
      if (province && String(f.properties.PROV_CODE) !== province) return false
      if (district && f.properties.AMP_CODE !== district) return false
      return true
    })
  }, [features, region, province, district])

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
    setHoveredProvince('')
    setHoveredDistrict('')
    setRegion(r)
    if (r !== 'C' && layer === 'analysis') setLayer('detected')
    setProvince('')
    setDistrict('')
  }

  function selectProvince(provCode: string) {
    setHoveredProvince('')
    setHoveredDistrict('')
    if (!region) {
      const f = features.find((f) => String(f.properties.PROV_CODE) === provCode)
      if (f) setRegion(f.properties.Region)
    }
    setProvince(provCode)
    setDistrict('')
  }

  function selectDistrict(ampCode: string) {
    setHoveredProvince('')
    setHoveredDistrict('')
    setDistrict(ampCode)
  }

  function toggleLayer(next: 'detected' | 'classes' | 'analysis') {
    if (next === 'analysis' && region !== 'C') return
    setLayer(next)
    setShowPixelRaster(true)
  }

  function clearFilters() {
    setRegion('')
    setProvince('')
    setDistrict('')
    setLayer('detected')
  }

  const hasActiveFilters = region !== '' || province !== '' || district !== ''

  function stepBack(): boolean {
    if (district) { setDistrict(''); return true }
    if (province) { setProvince(''); return true }
    if (region) { setRegion(''); setLayer('detected'); return true }
    if (layer !== 'detected') { setLayer('detected'); return true }
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

  function openCase(name: string) {
    setSelectedCase(name)
    setEvidenceOpen(true)
  }

  const dashboardTitle = district
    ? districtOptions.find(([code]) => code === district)?.[1] ?? t('explore.extentStep.district')
    : province
      ? provinceOptions.find(([code]) => code === province)?.[1] ?? t('explore.extentStep.province')
      : region
        ? REGION_NAMES[region] ?? region
        : t('explore.thailand')

  return (
    <div className="explore-layout">
      <aside className="explore-sidebar">
        <h1 className="explore-sr-only">{t('explore.srTitle')}</h1>
        <div className="breadcrumb-mini">
          {t('explore.thailand')}
          {region && <> &gt; {REGION_NAMES[region] ?? region}</>}
          {province && <> &gt; {provinceOptions.find(([code]) => code === province)?.[1] ?? province}</>}
          {district && <> &gt; {districtOptions.find(([code]) => code === district)?.[1] ?? district}</>}
        </div>

        <div className="sidebar-section-label">{t('explore.filters')}</div>
        <label className="sidebar-label" htmlFor="filter-region">{t('explore.region')}</label>
        <select
          id="filter-region"
          value={region}
          onChange={(e) => {
            setRegion(e.target.value)
            if (e.target.value !== 'C' && layer === 'analysis') setLayer('detected')
            setProvince('')
            setDistrict('')
          }}
        >
          <option value="">{t('explore.allRegions')}</option>
          {Object.entries(REGION_NAMES).map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>

        <label className="sidebar-label" htmlFor="filter-province">{t('explore.province')}</label>
        <select
          id="filter-province"
          value={province}
          disabled={!region}
          onChange={(e) => {
            setProvince(e.target.value)
            setDistrict('')
          }}
        >
          <option value="">{t('explore.all')}</option>
          {provinceOptions.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>

        <label className="sidebar-label" htmlFor="filter-district">{t('explore.district')}</label>
        <select id="filter-district" value={district} disabled={!province} onChange={(e) => setDistrict(e.target.value)}>
          <option value="">{t('explore.all')}</option>
          {districtOptions.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>

        <button className="clear-filters-btn" disabled={!hasActiveFilters} onClick={clearFilters}>
          {t('explore.clearFilters')}
        </button>

        <div className="sidebar-section-label" style={{ marginTop: 20 }}>
          {t('explore.layers')}
        </div>
        <label className="layer-checkbox">
          <input type="checkbox" checked={showPixelRaster} onChange={(e) => setShowPixelRaster(e.target.checked)} />
          {t('explore.rasterOverlay')}
        </label>
        <label className="layer-checkbox">
          <input type="checkbox" checked={showBoundaryLines} onChange={(e) => setShowBoundaryLines(e.target.checked)} />
          {t('explore.boundaryLines')}
        </label>
        <label className="layer-checkbox" title={layer === 'analysis' ? t('explore.clustersHiddenInEvidence') : ''}><input type="checkbox" checked={showClusters} disabled={layer === 'analysis'} onChange={e => setShowClusters(e.target.checked)} />{t('explore.clusterComposition')}</label>

        <div className="sidebar-section-label" style={{ marginTop: 20 }}>
          {t('explore.mapLegend')}
        </div>
        <div className="legend-list">
          {layer === 'detected' && <div className="legend-item"><span className="legend-swatch" style={{ background: '#facc15' }} /> {t('explore.legend.detected')}</div>}
          <div className="legend-item"><span className="legend-swatch" style={{ background: '#a3e635' }} /> {t('explore.legend.c1')}</div>
          <div className="legend-item"><span className="legend-swatch" style={{ background: '#38bdf8' }} /> {t('explore.legend.c2')}</div>
          <div className="legend-overlay-status">{t('explore.legend.rasterPrefix')} {layer === 'detected' ? t('explore.raster.detected') : layer === 'classes' ? t('explore.raster.type') : t('explore.raster.evidence')}{!showPixelRaster && t('explore.legend.hidden')}</div>
          {region === 'C' && <div className="evidence-map-legend">
            <h3>{t('explore.evidenceColors')}</h3><p>{t('explore.probabilityByDuration')}</p>
            <div className="evidence-legend-matrix"><span /><span>&gt;0&ndash;&lt;3</span><span>3&ndash;&lt;5</span><span>&ge;5</span>
              {['\u226575%', '50\u2013<75%', '<50%'].map((label, row) => <Fragment key={label}><span>{label}</span>{[0, 1, 2].map(col => <i key={col} style={{ background: BIV_COLORS[bivClassId(row, col)] }} role="img" aria-label={label + ' probability; ' + ['over 0 to under 3', '3 to under 5', '5 or more'][col] + ' years'} />)}</Fragment>)}
            </div><p>{t('explore.legend.yellowNote')}</p>
          </div>}
          <div className="legend-item"><span className="legend-line solid" /> {t('explore.legend.selectedBoundary')}</div>
          <div className="legend-item"><span className="legend-line hovered" /> {t('explore.legend.hoveredArea')}</div>
          {region === 'C' && <div className="legend-item"><span className="case-legend-dot" /> {t('explore.legend.caseStudyLocation')}</div>}
          <p className="legend-footnote">{t('explore.legend.transparentNote')}</p>
          <div className="legend-item"><span className="legend-line dashed" /> {t('explore.legend.subAreas')}</div>
          {layer !== 'analysis' && <div className="cluster-key"><span className="cluster-key-ring" /><span>{t('explore.clusterKey.text')}<br />{t('explore.clusterKey.ring')}</span></div>}
        </div>

        <p className="stat-sub" style={{ marginTop: 20 }}>{t('explore.filtersUpdateNote')}</p>
      </aside>

      <div className="explore-main">
        <div className="explore-map">
          <div className="map-layer-select">
            <label htmlFor="map-pixel-layer">{t('explore.mapLayer')}</label>
            <select id="map-pixel-layer" value={layer} onChange={e => {
              const next = e.target.value
              if (next === 'detected' || next === 'classes' || next === 'analysis') toggleLayer(next)
            }}>
              <option value="detected">{t('explore.mapLayer.detected')}</option>
              <option value="classes">{t('explore.mapLayer.type')}</option>
              <option value="analysis" disabled={region !== 'C'}>{t('explore.mapLayer.evidence')}{region !== 'C' ? t('explore.mapLayer.centralOnly') : ''}</option>
            </select>
          </div>
          <button className="map-home" aria-label={t('explore.resetMap')} onClick={clearFilters}><LineIcon name="pin" /></button>
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
            showAbandoned={layer === 'detected'}
            hoveredProvince={hoveredProvince}
            hoveredDistrict={hoveredDistrict}
            onSelectRegion={selectRegion}
            onSelectProvince={selectProvince}
            onSelectDistrict={selectDistrict}
            onSelectCase={openCase}
            onHoverProvince={setHoveredProvince}
            onHoverDistrict={setHoveredDistrict}
            onClickOutside={stepBack}
          />
        </div>

        <div className="explore-resizer" onMouseDown={startResize} />

        <aside className="explore-dashboard" style={{ '--dash-w': `${dashboardWidth}px` } as CSSProperties}>

          <div className="total-card">
                <div className="extent-label">{t('explore.selectedExtent')}</div><div className="extent-title">{dashboardTitle}</div>
                <div className="extent-steps" aria-label="Exploration depth">{[t('explore.extentStep.thailand'), t('explore.extentStep.region'), t('explore.extentStep.province'), t('explore.extentStep.district')].map((label, index) => <span key={label} className={index === (district ? 3 : province ? 2 : region ? 1 : 0) ? 'active' : ''}><b>{index + 1}</b><small>{label}</small></span>)}</div>
          </div>
          <DecisionDashboard
            features={filtered} loading={loading} region={region} province={province} district={district}
            cases={casesInBoundary} onSelectRegion={selectRegion} onSelectProvince={selectProvince}
            onSelectDistrict={selectDistrict} onHoverProvince={setHoveredProvince} onHoverDistrict={setHoveredDistrict}
            hoveredProvince={hoveredProvince} hoveredDistrict={hoveredDistrict} onOpenCase={openCase}
          />
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
