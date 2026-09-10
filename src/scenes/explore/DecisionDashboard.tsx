import { useEffect, useMemo, useState } from 'react'
import type { AmphoeFeature } from '../../hooks/useBoundaryData'
import { aggregate, REGION_NAMES } from '../../hooks/useBoundaryData'
import { useLanguage } from '../../i18n/LanguageContext'
import { BIV_COLORS, bivClassId } from '../../utils/bivariateColors'
import { groupAreas, rankAreas, summarizeEvidence, type RankLevel, type RankMetric } from '../../utils/dashboardMetrics'
import { MODEL_RESULT } from '../../utils/caseModelResults'
import { caseLabel } from '../../utils/caseLabels'
import { evidencePath, fetchEvidence, useDashboardEvidence } from './useDashboardEvidence'
import LocationMiniMap from './LocationMiniMap'
import './DecisionDashboard.css'

const number = (n: number, digits = 0) => n.toLocaleString(undefined, { maximumFractionDigits: digits })

interface Props {
  features: AmphoeFeature[]
  loading: boolean
  region: string
  province: string
  district: string
  cases: GeoJSON.Feature[]
  onSelectRegion: (code: string) => void
  onSelectProvince: (code: string) => void
  onSelectDistrict: (code: string) => void
  onHoverProvince: (code: string) => void
  onHoverDistrict: (code: string) => void
  hoveredProvince: string
  hoveredDistrict: string
  onOpenCase: (name: string) => void
}

function TopAreas(props: Props) {
  const { t } = useLanguage()
  const [choice, setChoice] = useState<RankLevel>('province')
  const [metricChoice, setMetric] = useState<RankMetric>('area')
  const level: RankLevel = props.province ? 'district' : props.region ? 'province' : choice
  const metric = metricChoice === 'priority' && props.region !== 'C' ? 'area' : metricChoice
  const groups = useMemo(() => groupAreas(props.features, level), [props.features, level])
  const [attempt, setAttempt] = useState(0)
  const [priority, setPriority] = useState<{ key: string; values: Record<string, number | null> }>({ key: '', values: {} })
  const key = [props.region, props.province, level, groups.map(g => g.code).join(','), attempt].join('/')
  useEffect(() => {
    if (metric !== 'priority' || !groups.length) return
    const controller = new AbortController()
    Promise.all(groups.map(async group => {
      try {
        const rows = await fetchEvidence(evidencePath(level === 'province' ? group.code : props.province, level === 'district' ? group.code : ''), controller.signal)
        return [group.code, summarizeEvidence(rows).priority] as const
      } catch { return [group.code, null] as const }
    })).then(entries => {
      if (!controller.signal.aborted) setPriority({ key, values: Object.fromEntries(entries) })
    })
    return () => controller.abort()
  }, [groups, key, level, metric, props.province])
  const pending = metric === 'priority' && groups.length > 0 && priority.key !== key
  const priorityValues = priority.key === key ? priority.values : {}
  const ranked = rankAreas(groups, metric, priorityValues)
  const missing = metric === 'priority' && !pending ? groups.filter(g => priorityValues[g.code] == null).length : 0
  const maxValue = Math.max(...ranked.map(g => g.value), 1e-9)
  const unit = metric === 'share' ? '%' : metric === 'density' ? t('dashboard.raiKm') : t('dashboard.rai')
  function select(code: string) {
    if (level === 'region') props.onSelectRegion(code)
    else if (level === 'province') props.onSelectProvince(code)
    else props.onSelectDistrict(code)
  }
  function hover(code: string) {
    if (level === 'province') props.onHoverProvince(code)
    if (level === 'district') props.onHoverDistrict(code)
  }
  return <section className="decision-panel">
    <div className="decision-heading"><h2>{t('dashboard.topAreas')}</h2><span>{t('dashboard.level.' + level)}</span></div>
    <div className="ranking-controls">
      {!props.region && <label>{t('dashboard.compare')}<select value={choice} onChange={e => { if (e.target.value === 'province' || e.target.value === 'region') { hover(''); setChoice(e.target.value) } }}>
        <option value="province">{t('dashboard.level.province')}</option><option value="region">{t('dashboard.level.region')}</option>
      </select></label>}
      <label>{t('dashboard.rankBy')}<select value={metric} onChange={e => {
        const v = e.target.value
        if (v === 'area' || v === 'share' || v === 'density' || v === 'priority') { setMetric(v); hover('') }
      }}>
        <option value="area">{t('dashboard.totalArea')}</option><option value="share">{t('dashboard.areaShare')}</option>
        <option value="density">{t('dashboard.density')}</option><option value="priority" disabled={props.region !== 'C'}>{t('dashboard.priority')}{props.region !== 'C' ? ' (' + t('dashboard.centralOnly') + ')' : ''}</option>
      </select></label>
    </div>
    <p className="decision-caption">{t('dashboard.metric.' + metric)}</p>
    {props.loading || pending ? <p role="status" className="decision-empty">{t('dashboard.loading')}</p> : <>
      <ol className="ranking-list">
        {ranked.map((row, i) => <li key={row.code}><button className={row.code === (level === 'province' ? props.hoveredProvince : props.hoveredDistrict) ? 'is-hovered' : ''}
          onClick={() => select(row.code)} onMouseEnter={() => hover(row.code)} onMouseLeave={() => hover('')} onFocus={() => hover(row.code)} onBlur={() => hover('')}>
          <span className="rank-number">{i + 1}</span><span className="rank-content"><span className="rank-name">{level === 'region' ? REGION_NAMES[row.code] : row.name}</span>
          <span className="rank-track"><span style={{ width: row.value / maxValue * 100 + '%' }} /></span></span>
          <span className="rank-value">{number(row.value, metric === 'area' || metric === 'priority' ? 0 : 3)} <small>{unit}</small></span>
        </button></li>)}
      </ol>
      {!ranked.length && <p className="decision-empty">{t('dashboard.noData')}</p>}
      {missing > 0 && <p className="decision-caption" role="status">{missing} {t('dashboard.missingRanks')} <button className="decision-link" onClick={() => setAttempt(n => n + 1)}>{t('dashboard.retry')}</button></p>}
    </>}
    <p className="decision-caption">{t('dashboard.drillHint')}</p>
  </section>
}

export default function DecisionDashboard(props: Props) {
  const { t } = useLanguage()
  const { features, region, province, district } = props
  const agg = useMemo(() => aggregate(features), [features])
  const evidence = useDashboardEvidence(region, province, district)
  const summary = useMemo(() => summarizeEvidence(evidence.rows), [evidence.rows])
  const ready = evidence.status === 'ready'
  const hasData = !props.loading && features.length > 0
  const evidenceNote = evidence.status === 'unavailable' ? t('dashboard.centralOnly') : evidence.status === 'loading' ? t('dashboard.loading') : evidence.status === 'error' ? t('dashboard.loadError') : t('dashboard.evidenceSubset')
  const [mapCase, setMapCase] = useState('')
  const cases = props.cases.filter(f => MODEL_RESULT[String(f.properties?.case_name)])
    .sort((a, b) => MODEL_RESULT[String(b.properties?.case_name)].probability - MODEL_RESULT[String(a.properties?.case_name)].probability)
  const durationLabels = ['>0–<3', '3–<5', '≥5']
  const durationColors = ['#38bdf8', '#70cdb7', '#facc15']
  return <div className="decision-dashboard">
    <div className="decision-kpis">
      <article className="decision-kpi primary"><h2>{t('dashboard.detected')}</h2><strong>{hasData ? number(agg.areaAban) : '—'} <small>{t('dashboard.rai')}</small></strong><p>{hasData ? number(agg.pxTotal) + ' px' : props.loading ? t('dashboard.loading') : t('dashboard.noData')} &middot; {t('dashboard.nominal')}</p></article>
      <article className="decision-kpi"><h2>{t('dashboard.areaShare')}</h2><strong>{hasData && agg.areaTot > 0 ? number(agg.pctAban, 3) : '—'} <small>%</small></strong><p>{t('dashboard.shareBasis')}</p></article>
      <article className="decision-kpi"><h2>{t('dashboard.priority')}</h2><strong>{ready && summary.priority !== null ? number(summary.priority) : '—'} <small>{t('dashboard.rai')}</small></strong><p>{t('dashboard.priorityRule')}<br />{evidenceNote}</p></article>
      <article className="decision-kpi"><h2>{t('dashboard.longDuration')}</h2><strong>{ready && summary.durationShares[2] !== null ? number(summary.durationShares[2], 1) : '—'} <small>%</small></strong><p>{ready ? number(summary.durations[2]) + ' ' + t('dashboard.rai') : evidenceNote}<br />{t('dashboard.longBasis')}</p></article>
    </div>
    <div className="decision-patterns">
      <section className="decision-panel"><div className="decision-heading"><h2>{t('explore.typeComposition')}</h2></div>
        {hasData && agg.pxTotal > 0 ? <div className="decision-type">
          <div className="decision-donut" role="img" aria-label={'C1 ' + number(agg.pct1, 1) + '%, C2 ' + number(agg.pct2, 1) + '%'} style={{ background: 'conic-gradient(#a3e635 0 ' + agg.pct1 + '%, #38bdf8 ' + agg.pct1 + '% 100%)' }}><span>C1 + C2<small>{t('dashboard.detected')}</small></span></div>
          <div className="decision-type-legend">{[['C1', agg.pct1, agg.pxType1 * 0.5625, '#a3e635'], ['C2', agg.pct2, agg.pxType2 * 0.5625, '#38bdf8']].map(([label, share, area, color]) => <div key={String(label)}><i style={{ background: String(color) }} /><span>{label}<small>{number(Number(area))} {t('dashboard.rai')}</small></span><b>{number(Number(share), 1)}%</b></div>)}</div>
        </div> : <p className="decision-empty">{props.loading ? t('dashboard.loading') : t('dashboard.noDetected')}</p>}
      </section>
      <section className="decision-panel"><div className="decision-heading"><h2>{t('dashboard.durationProfile')}</h2><span>{t('dashboard.years')}</span></div>
        {ready ? <div className="duration-profile">{durationLabels.map((label, i) => <div className="duration-row" key={label}><div><span>{label} {t('dashboard.years')}</span><b>{summary.durationShares[i] === null ? '—' : number(summary.durationShares[i]!, 1) + '%'}</b></div><div className="duration-track"><span style={{ width: (summary.durationShares[i] ?? 0) + '%', background: durationColors[i] }} /></div><small>{number(summary.durations[i])} {t('dashboard.rai')}</small></div>)}</div>
          : <div className="decision-empty"><p role="status">{evidenceNote}</p>{region !== 'C' && <button className="decision-link" onClick={() => props.onSelectRegion('C')}>{t('dashboard.exploreCentral')}</button>}{evidence.status === 'error' && <button className="decision-link" onClick={evidence.retry}>{t('dashboard.retry')}</button>}</div>}
        <p className="decision-caption">{t('dashboard.durationNote')}</p>
      </section>
    </div>
    {!district && <TopAreas {...props} />}
    {region === 'C' && <section className="decision-panel">
      <div className="decision-heading"><h2>{t('dashboard.matrix')}</h2><span>{t('dashboard.rai')}</span></div>
      <p className="decision-caption">{t('dashboard.scoreNote')}</p>
      {ready ? <div className="decision-matrix" role="table" aria-label={t('dashboard.matrix')}>
        <div role="row" className="decision-matrix-row"><span role="columnheader">{t('dashboard.modelScore')}</span>{durationLabels.map(label => <span role="columnheader" key={label}>{label} {t('dashboard.years')}</span>)}</div>
        {['≥75%', '50–<75%', '<50%'].map((label, r) => <div role="row" className="decision-matrix-row" key={label}><span role="rowheader">{label}</span>{[0, 1, 2].map(c => {
          const id = bivClassId(r, c)
          const cell = evidence.rows.find(row => row.class_id === id)!
          return <div role="cell" className={'decision-matrix-cell' + (id === 9 ? ' priority-cell' : '')} key={id} style={{ background: BIV_COLORS[id], color: id === 9 ? '#17231f' : '#fff' }} title={number(cell.pixel_count) + ' px; ' + number(cell.area_rai, 2) + ' rai'}><b>{number(cell.area_rai)}</b><small>{id === 9 ? t('dashboard.priorityTag') : number(cell.pixel_count) + ' px'}</small></div>
        })}</div>)}
      </div> : <p className="decision-empty" role="status">{evidenceNote} {evidence.status === 'error' && <button className="decision-link" onClick={evidence.retry}>{t('dashboard.retry')}</button>}</p>}
      {ready && <p className="decision-caption">{t('dashboard.evidenceCoverage')} {number(summary.pixels)} / {number(agg.pxTotal)} px{agg.pxTotal > 0 ? ' (' + number(summary.pixels / agg.pxTotal * 100, 1) + '%)' : ''}</p>}
    </section>}
    <section className="decision-panel">
      <div className="decision-heading"><h2>{t('dashboard.cases')}</h2><span>{cases.length} {t('dashboard.locations')}</span></div>
      <p className="decision-caption">{t('dashboard.caseNote')}</p>
      <div className="review-cases">{cases.map(f => {
        const name = String(f.properties?.case_name)
        const model = MODEL_RESULT[name]
        return <article className="review-case" key={name}>
          <div className="review-case-title"><h3>{caseLabel(name)}</h3><span className={model.probability >= 75 && model.duration >= 5 ? 'review-tag priority' : 'review-tag'}>{model.type}</span></div>
          <p>{model.amphoe} &middot; {model.province}</p>
          <dl><div><dt>{t('dashboard.yod')}</dt><dd>{model.yod}</dd></div><div><dt>{t('dashboard.duration')}</dt><dd>{model.duration} {t('dashboard.years')}</dd></div><div><dt>{t('dashboard.modelScore')}</dt><dd>{model.probability}%</dd></div></dl>
          <div className="review-actions"><button className="decision-button" onClick={() => props.onOpenCase(name)}>{t('dashboard.viewEvidence')} &rarr;</button><button className="decision-link" aria-expanded={mapCase === name} onClick={() => setMapCase(mapCase === name ? '' : name)}>{t('dashboard.location')}</button></div>
          {mapCase === name && <LocationMiniMap lon={model.lon} lat={model.lat} label={caseLabel(name)} provCode={model.provCode} />}
        </article>
      })}</div>
      {!cases.length && <p className="decision-empty">{t('dashboard.noCases')}</p>}
    </section>
    <footer className="decision-coverage"><h2>{t('dashboard.coverage')}</h2><p>{t('dashboard.coverageNote')}</p><p>{t('dashboard.historyNote')}</p><p>{t('dashboard.areaNote')}</p></footer>
  </div>
}
