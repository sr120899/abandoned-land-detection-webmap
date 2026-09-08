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
} from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'
import { parseCSV, num } from '../../utils/csv'
import { caseLabel } from '../../utils/caseLabels'
import { BIV_COLORS, BIV_PROBABILITY_ROWS, BIV_DURATION_COLS, bivClassId } from '../../utils/bivariateColors'
import LocationMiniMap from './LocationMiniMap'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, annotationPlugin)

const BASE = import.meta.env.BASE_URL

// Real Model Result values, sampled directly from the v3_20/v3_21 rasters at
// each point's coordinates (not the GEE-side featureBandList summary, which
// uses a different NBR-based yod that can disagree with the official raster —
// see Data_Notes caveat about nbr_yod vs v3_21 yod for point_5).
const MODEL_RESULT: Record<
  string,
  {
    lat: number
    lon: number
    amphoe: string
    province: string
    provCode: string
    probability: number
    yod: number
    duration: number
    type: 'C1' | 'C2'
    nbrChangeYear: number
  }
> = {
  point_5: {
    lat: 14.303891, lon: 100.321088, amphoe: 'Bang Sai', province: 'Phra Nakhon Si Ayudhya', provCode: '14',
    probability: 50, yod: 2011, duration: 14, type: 'C2', nbrChangeYear: 2013,
  },
  point_4: {
    lat: 14.448408, lon: 100.580927, amphoe: 'Bang Pahan', province: 'Phra Nakhon Si Ayudhya', provCode: '14',
    probability: 98, yod: 2000, duration: 25, type: 'C1', nbrChangeYear: 2001,
  },
  point_1: {
    lat: 13.585415, lon: 100.676196, amphoe: 'Bang Phi', province: 'Samut Prakarn', provCode: '11',
    probability: 86, yod: 2000, duration: 25, type: 'C2', nbrChangeYear: 2013,
  },
}

const TYPE_LABEL: Record<'C1' | 'C2', string> = {
  C1: 'C1 (พื้นที่ไร่ร้าง / abandoned field crops)',
  C2: 'C2 (ไม้พุ่มขึ้นปกคลุม / shrub encroachment)',
}

// Dataset-level separation scores (how well each feature tells "abandoned"
// apart from "not abandoned" across the whole training set) — NOT per-point
// values and NOT Feature Importance. Labels spell out plain-English meaning
// plus the underlying GEE field name so it stays traceable.
const FEATURE_SEPARATION = [
  { label: 'Texture Roughness (GLCM Entropy)', field: 'tex_ent', value: 5.263, stars: '★★★' },
  { label: 'NBR Baseline Level (5yr)', field: 'nbr_preval_5yr', value: 1.323, stars: '★★' },
  { label: 'Vegetation Trend (EVI Slope, 5yr)', field: 'evi_slope', value: 1.082, stars: '★★' },
  { label: 'NBR Change Size (5yr)', field: 'nbr_mag_5yr', value: 0.879, stars: '★' },
  { label: 'NBR Change Speed (5yr)', field: 'nbr_rate_5yr', value: 0.757, stars: '★' },
  { label: 'NDVI Baseline Level', field: 'lt_preval', value: 0.361, stars: '' },
]
const MAX_SEP = 5.263

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
    fetch(`${BASE}data/Case_Studies_Indices.csv`)
      .then((r) => r.text())
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
        setRows(parsed)
      })
  }, [caseName])

  useEffect(() => {
    setSelectedIndices(['nbr'])
    setLightboxIndex(null)
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

  const CHART_TITLE: Record<IndexKey, string> = {
    nbr: 'NBR Fitted Time Series (หลักฐานหลัก) · 2000–2025',
    ndvi: 'NDVI (raw) · 2000–2025',
    sar: 'SAR VH (dB) · 2015–2025',
  }

  function buildChart(index: IndexKey) {
    // SAR only has coverage from 2015 onward — drop the earlier empty years so
    // the axis auto-scales to the data that actually exists for that index.
    const visibleRows = index === 'sar' ? rows.filter((r) => r.year >= 2015) : rows
    const years = visibleRows.map((r) => r.year)

    const data =
      index === 'nbr'
        ? {
            labels: years,
            datasets: [
              {
                label: 'Observed NBR',
                data: visibleRows.map((r) => r.nbr_observed),
                borderColor: '#93a1c2',
                backgroundColor: '#93a1c2',
                pointRadius: 3,
                tension: 0,
              },
              {
                label: 'Fitted NBR',
                data: visibleRows.map((r) => r.nbr_fitted),
                borderColor: '#2dd4bf',
                backgroundColor: 'transparent',
                pointRadius: 0,
                borderWidth: 2,
                tension: 0.15,
              },
            ],
          }
        : index === 'ndvi'
          ? {
              labels: years,
              datasets: [
                {
                  label: 'NDVI (raw)',
                  data: visibleRows.map((r) => r.ndvi),
                  borderColor: '#2dd4bf',
                  backgroundColor: 'transparent',
                  pointRadius: 2,
                  tension: 0.2,
                },
              ],
            }
          : {
              labels: years,
              datasets: [
                {
                  label: 'SAR VH (dB)',
                  data: visibleRows.map((r) => r.sar),
                  borderColor: '#fbbf24',
                  backgroundColor: 'transparent',
                  pointRadius: 2,
                  tension: 0.2,
                },
              ],
            }

    let annotations: object = {}
    if (index === 'nbr') {
      const disturbanceRow = rows.find((r) => r.year === result.nbrChangeYear)
      const disturbanceBase = disturbanceRow?.nbr_observed ?? disturbanceRow?.nbr_fitted ?? 0
      const nbrValues = rows.flatMap((r) => [r.nbr_observed, r.nbr_fitted]).filter((v): v is number => v !== null)
      const nbrMax = nbrValues.length ? Math.max(...nbrValues) : 1
      annotations = {
        disturbanceArrow: {
          type: 'line',
          xMin: String(result.nbrChangeYear),
          xMax: String(result.nbrChangeYear),
          yMin: disturbanceBase,
          yMax: nbrMax + (nbrMax - disturbanceBase) * 0.6 + 0.15,
          borderColor: '#f87171',
          borderWidth: 2,
          arrowHeads: { end: { display: true, width: 7, length: 9 } },
        },
        disturbanceLabel: {
          type: 'label',
          xValue: String(result.nbrChangeYear),
          yValue: nbrMax + (nbrMax - disturbanceBase) * 0.6 + 0.2,
          content: [`Disturbance (${result.nbrChangeYear})`],
          color: '#f87171',
          font: { size: 11, weight: 'bold' },
          position: { x: 'start', y: 'center' },
          xAdjust: 4,
        },
      }
    }

    const options: ChartOptions<'line'> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#93a1c2', boxWidth: 14 } },
        annotation: { annotations },
      },
      scales: {
        x: { ticks: { color: '#93a1c2' }, grid: { color: '#24314f' } },
        y: { ticks: { color: '#93a1c2' }, grid: { color: '#24314f' } },
      },
    }

    return { data, options }
  }

  const photoSrc = (year: string) => `${BASE}photos/${caseName}/abandoned_land_${caseName}_${year}.png`

  return (
    <div className="vsc">
      <div className="vsc-header">
        <div className="vsc-badge">05</div>
        <div>
          <div className="vsc-title-th">ตัวอย่างพื้นที่ตรวจสอบ: {caseLabel(caseName)} ({result.amphoe})</div>
          <div className="vsc-title-en">VALIDATION SAMPLE: {caseLabel(caseName).toUpperCase()} ({result.amphoe.toUpperCase()})</div>
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
              NBR-based change year (nbr_yod) = {result.nbrChangeYear} — a separate diagnostic from the official YOD above; the two can disagree (see Data Notes).
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

          <div className="chart-card-header">
            <div className="chart-title">Time series evidence</div>
            <div className="pill-tabs small multi">
              {INDEX_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  className={selectedIndices.includes(opt.key) ? 'active' : ''}
                  onClick={() => toggleIndex(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className={`chart-grid ${selectedIndices.length > 1 ? 'multi' : ''}`}>
            {INDEX_OPTIONS.filter((opt) => selectedIndices.includes(opt.key)).map((opt) => {
              const { data, options } = buildChart(opt.key)
              return (
                <div className="chart-card" key={opt.key}>
                  <div className="chart-title">{CHART_TITLE[opt.key]}</div>
                  <div className="chart-canvas-wrap">
                    <Line data={data} options={options} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="vsc-right-col">
          <div className="panel-title">Feature Evidence (Separation Score)</div>
          <p className="stat-sub">ระดับชุดข้อมูล ไม่ใช่ค่าของจุดนี้โดยเฉพาะ และไม่ใช่ Feature Importance</p>
          {FEATURE_SEPARATION.map((f) => (
            <div className="sep-row" key={f.label}>
              <span className="sep-label">{f.label}</span>
              <div className="sep-track"><div style={{ width: `${(f.value / MAX_SEP) * 100}%` }} /></div>
              <span className="sep-value">{f.value.toFixed(3)} {f.stars}</span>
            </div>
          ))}

          <div className="key-insight-card">
            <div className="panel-title">💡 Key Insight</div>
            <p>
              Texture และ NBR time-series ให้สัญญาณที่แยกกลุ่มได้เด่นกว่า NDVI ซึ่งใช้เป็นข้อมูลประกอบ — สำหรับ {caseLabel(caseName)} เส้น fitted
              เปลี่ยนช่วงชัดเจนที่ปี {result.nbrChangeYear} แต่ยังต้องตรวจประวัติการใช้ประโยชน์ร่วมด้วยก่อนสรุปว่าเป็นพื้นที่รกร้างจริง
            </p>
          </div>
        </div>
      </div>

      {lightboxIndex !== null && (
        <div className="photo-lightbox" onClick={() => setLightboxIndex(null)}>
          <button type="button" className="close-btn photo-lightbox-close" onClick={() => setLightboxIndex(null)}>
            ✕ Close
          </button>
          <button
            type="button"
            className="photo-lightbox-nav prev"
            disabled={lightboxIndex === 0}
            onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i === null ? i : Math.max(i - 1, 0))) }}
          >
            ‹
          </button>
          <img
            src={photoSrc(photoYears[lightboxIndex])}
            alt={`${caseLabel(caseName)} ${photoYears[lightboxIndex]}`}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            className="photo-lightbox-nav next"
            disabled={lightboxIndex === photoYears.length - 1}
            onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i === null ? i : Math.min(i + 1, photoYears.length - 1))) }}
          >
            ›
          </button>
          <div className="photo-lightbox-caption">{caseLabel(caseName)} · {photoYears[lightboxIndex]}</div>
        </div>
      )}
    </div>
  )
}

export default ValidationSampleCard
