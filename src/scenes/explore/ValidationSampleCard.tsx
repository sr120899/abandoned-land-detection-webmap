import { Fragment, useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  type ChartOptions,
  type ChartDataset,
} from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'
import { parseCSV, num } from '../../utils/csv'
import { caseLabel } from '../../utils/caseLabels'
import { MODEL_RESULT } from '../../utils/caseModelResults'
import { BIV_COLORS, BIV_PROBABILITY_ROWS, BIV_DURATION_COLS, bivClassId } from '../../utils/bivariateColors'
import LocationMiniMap from './LocationMiniMap'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, annotationPlugin)

const BASE = import.meta.env.BASE_URL

const TYPE_LABEL: Record<'C1' | 'C2', string> = {
  C1: 'C1 (พื้นที่ไร่ร้าง / abandoned field crops)',
  C2: 'C2 (ไม้พุ่มขึ้นปกคลุม / shrub encroachment)',
}

const PHOTO_YEARS: Record<string, string[]> = {
  point_5: ['2019', '2021', '2022', '2023', '2024'],
  point_4: ['2019', '2021', '2023', '2024', '2025'],
}

interface IndexRow {
  case_name: string
  year: number
  nbr_observed: number | null
  nbr_fitted: number | null
  ndvi: number | null
  sar: number | null
}

type IndexKey = 'nbr' | 'ndvi' | 'sar'
const INDEX_OPTIONS: { key: IndexKey; label: string }[] = [
  { key: 'nbr', label: 'NBR' },
  { key: 'ndvi', label: 'NDVI' },
  { key: 'sar', label: 'SAR VH' },
]

function MiniBivariateLegend() {
  return (
    <div className="mini-biv-legend">
      <div className="mini-biv-legend-title">Probability × Duration</div>
      <div className="mini-biv-legend-grid">
        <div />
        {BIV_DURATION_COLS.map((label) => (
          <div className="mini-biv-legend-axis center" key={label}>{label}</div>
        ))}
        {BIV_PROBABILITY_ROWS.map((probLabel, rowIdx) => (
          <Fragment key={probLabel}>
            <div className="mini-biv-legend-axis">{probLabel}</div>
            {BIV_DURATION_COLS.map((_, colIdx) => (
              <div
                key={colIdx}
                className="mini-biv-legend-swatch"
                style={{ background: BIV_COLORS[bivClassId(rowIdx, colIdx)] }}
              />
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  )
}

interface Props {
  caseName: string
}

function ValidationSampleCard({ caseName }: Props) {
  const [rows, setRows] = useState<IndexRow[]>([])
  const [selectedIndices, setSelectedIndices] = useState<IndexKey[]>(['nbr'])
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const result = MODEL_RESULT[caseName]
  const photoYears = PHOTO_YEARS[caseName] ?? []

  useEffect(() => {
    if (lightboxIndex === null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') setLightboxIndex((i) => (i === null ? i : Math.min(i + 1, photoYears.length - 1)))
      else if (e.key === 'ArrowLeft') setLightboxIndex((i) => (i === null ? i : Math.max(i - 1, 0)))
      else if (e.key === 'Escape') setLightboxIndex(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxIndex, photoYears.length])

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${BASE}data/Case_Studies_Indices.csv`, { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error('Time series unavailable'); return r.text() })
      .then((text) => {
        const parsed = parseCSV(text)
          .filter((r) => r.case_name === caseName)
          .map((r) => ({
            case_name: r.case_name,
            year: num(r.year),
            nbr_observed: r.nbr_observed === '' ? null : num(r.nbr_observed),
            nbr_fitted: r.nbr_fitted === '' ? null : num(r.nbr_fitted),
            ndvi: r.ndvi === '' ? null : num(r.ndvi),
            sar: r.sar === '' ? null : num(r.sar),
          }))
          .sort((a, b) => a.year - b.year)
        if (!controller.signal.aborted) setRows(parsed)
      })
      .catch(() => { if (!controller.signal.aborted) setRows([]) })
    return () => controller.abort()
  }, [caseName])

if (!result) return <div className="stat-sub">ไม่มีข้อมูล Model Result สำหรับ {caseLabel(caseName)}</div>

  function toggleIndex(key: IndexKey) {
    setSelectedIndices((prev) => {
      if (prev.includes(key)) {
        return prev.length > 1 ? prev.filter((k) => k !== key) : prev
      }
      return [...prev, key]
    })
  }

  const datasets: ChartDataset<'line'>[] = []
  const addSeries = (label: string, field: 'nbr_observed' | 'nbr_fitted' | 'ndvi' | 'sar', color: string, axis = 'index') => {
    datasets.push({ label, data: rows.map(r => field === 'sar' && r.year < 2015 ? null : r[field]), borderColor: color, backgroundColor: color, yAxisID: axis, pointRadius: field === 'nbr_fitted' ? 0 : 2, borderWidth: 2, tension: 0, spanGaps: false })
  }
  if (selectedIndices.includes('nbr')) { addSeries('NBR observed', 'nbr_observed', '#91a7c6'); addSeries('NBR fitted', 'nbr_fitted', '#28e7dc') }
  if (selectedIndices.includes('ndvi')) addSeries('NDVI', 'ndvi', '#a3e635')
  if (selectedIndices.includes('sar')) addSeries('SAR VH (dB)', 'sar', '#fbbf24', 'sar')
  const chartData = { labels: rows.map(r => String(r.year)), datasets }
  const chartOptions: ChartOptions<'line'> = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: '#b8d5df', boxWidth: 12 }, onClick: () => {} },
      annotation: { annotations: selectedIndices.includes('nbr') && rows.some(r => r.year === result.nbrChangeYear) ? {
        change: { type: 'line', xMin: String(result.nbrChangeYear), xMax: String(result.nbrChangeYear), borderColor: '#fc9292', borderWidth: 1.5, borderDash: [5, 4], label: { display: true, content: 'NBR change: ' + result.nbrChangeYear, position: 'start', color: '#ffd8d8', backgroundColor: '#3c2538', font: { size: 10 } } },
      } : {} },
    },
    scales: {
      x: { ticks: { color: '#9cbfce', maxTicksLimit: 14, maxRotation: 0 }, grid: { color: '#1a414f' }, title: { display: true, text: 'Year', color: '#9cbfce' } },
      index: { display: selectedIndices.some(k => k !== 'sar'), position: 'left', title: { display: true, text: 'NBR / NDVI', color: '#9cbfce' }, ticks: { color: '#9cbfce' }, grid: { color: '#1a414f' } },
      sar: { display: selectedIndices.includes('sar'), position: 'right', title: { display: true, text: 'SAR VH (dB)', color: '#fbbf24' }, ticks: { color: '#fbbf24' }, grid: { drawOnChartArea: false } },
    },
  }

  const photoSrc = (year: string) => `${BASE}photos/${caseName}/abandoned_land_${caseName}_${year}.png`

  return (
    <div className="vsc">
      <div className="vsc-header">

        <div>
          <h2 className="vsc-title-th">{caseLabel(caseName)} &middot; {result.amphoe}</h2>
        </div>
      </div>

      <div className="vsc-body">
        <div className="vsc-map-col">
          <LocationMiniMap lon={result.lon} lat={result.lat} label={caseLabel(caseName)} provCode={result.provCode} />
          <MiniBivariateLegend />
        </div>

        <div className="vsc-mid-col">
          <div className="vsc-info-card">
            <div className="vsc-point-name">🔵 {caseLabel(caseName)}</div>
            <div className="stat-sub">Case study (model-detected, not a confirmed ground-truth sample)</div>
            <div className="vsc-row"><span>Location</span><span>{result.lat}, {result.lon}</span></div>
            <div className="vsc-row"><span /><span>{result.amphoe}, {result.province}</span></div>
            <div className="panel-title" style={{ marginTop: 10 }}>Model Result</div>
            <div className="vsc-row"><span>Probability</span><span>{result.probability}%</span></div>
            <div className="vsc-row"><span>YOD</span><span>{result.yod || 'Undated'}</span></div>
            <div className="vsc-row"><span>Duration</span><span>{result.duration} years</span></div>
            <div className="vsc-row"><span>Type</span><span>{TYPE_LABEL[result.type]}</span></div>
            <p className="stat-sub" style={{ marginTop: 6 }}>
              NBR-based change year (nbr_yod) = {result.nbrChangeYear} — a separate diagnostic from the official YOD above; the two can disagree.
            </p>
          </div>

          <div className="vsc-photo-row">
            <div className="panel-title">Satellite Time Series (ตัวอย่าง)</div>
            {photoYears.length > 0 ? (
              <div className="photo-strip">
                {photoYears.map((y, i) => (
                  <button
                    type="button"
                    className="photo-item"
                    key={y}
                    onClick={() => setLightboxIndex(i)}
                  >
                    <img src={photoSrc(y)} alt={`${caseLabel(caseName)} ${y}`} loading="lazy" />
                    <div className="photo-caption">{y}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="photo-strip-empty">
                <span className="photo-strip-empty-icon">🛰️</span>
                <span>ยังไม่มีรูปภาพดาวเทียมสำหรับ {caseLabel(caseName)}</span>
                <span className="stat-sub">No satellite time-series imagery on file yet for this case study</span>
              </div>
            )}
          </div>

        </div>

        <div className="vsc-right-col">
          <div className="chart-card-header">
            <div className="chart-title">Time series evidence</div>
            <div className="pill-tabs small multi">
              {INDEX_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  aria-pressed={selectedIndices.includes(opt.key)}
                  className={selectedIndices.includes(opt.key) ? 'active' : ''}
                  onClick={() => toggleIndex(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="chart-card">
            <div className="chart-canvas-wrap unified-case-chart"><Line data={chartData} options={chartOptions} /></div>
            <p className="stat-sub">Select one or more series. NBR / NDVI use the left axis; SAR VH uses the right axis (dB). Gaps indicate missing observations.</p>
          </div>


        </div>
      </div>
      {lightboxIndex !== null && <div className="photo-lightbox" role="dialog" aria-modal="true" aria-label="Satellite image" onClick={() => setLightboxIndex(null)}>
        <button type="button" className="close-btn photo-lightbox-close" onClick={() => setLightboxIndex(null)}>Close</button>
        <button type="button" className="photo-lightbox-nav prev" aria-label="Previous image" disabled={lightboxIndex === 0} onClick={e => { e.stopPropagation(); setLightboxIndex(Math.max(0, lightboxIndex - 1)) }}>&lsaquo;</button>
        <img src={photoSrc(photoYears[lightboxIndex])} alt={caseLabel(caseName) + ' ' + photoYears[lightboxIndex]} onClick={e => e.stopPropagation()} />
        <button type="button" className="photo-lightbox-nav next" aria-label="Next image" disabled={lightboxIndex === photoYears.length - 1} onClick={e => { e.stopPropagation(); setLightboxIndex(Math.min(photoYears.length - 1, lightboxIndex + 1)) }}>&rsaquo;</button>
        <div className="photo-lightbox-caption">{caseLabel(caseName)} &middot; {photoYears[lightboxIndex]}</div>
      </div>}
    </div>
  )
}

export default ValidationSampleCard
