import { useState } from 'react'

const GH_REPO = 'https://github.com/sr120899/ABANDONED_LAND_DETECTION'
const OPEN_DATA_LINKS = [
  { icon: '</>', label: 'GEE Scripts', href: `${GH_REPO}/tree/main/SCRIPT` },
  { icon: '📄', label: 'User Guide', href: `${GH_REPO}/blob/main/SCRIPT/AbandonedLandDetection_User%20Manual.pdf` },
  { icon: '🗄️', label: 'Raster Outputs', href: `${GH_REPO}/tree/main/DATA/PROVINCE_CLIPS` },
  { icon: '💾', label: 'Sample Data', href: `${GH_REPO}/tree/main/DATA/DATA_CASE%20STUDY` },
]

interface DetailField {
  label: string
  value: string
}

interface WorkflowDetail {
  icon: string
  title: string
  desc: string
  fields?: DetailField[]
}

interface WorkflowStep {
  num: string
  icon: string
  title: string
  summary: string
  caption: string
  details: WorkflowDetail[]
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    num: '01',
    icon: '🛰️',
    title: 'DATA',
    summary: 'LandSat 7/8/9 · Sentinel-1/2 · Dynamic World (2000–2025)',
    caption:
      'Landsat provides the long-term historical backbone, while Sentinel and Dynamic World enrich recent observations. All inputs are standardized into a consistent annual time series for subsequent feature extraction and classification.',
    details: [
      {
        icon: '🛰️',
        title: 'SATELLITE SOURCES',
        desc: 'Multi-source Earth observation data for monitoring historical land-use change.',
        fields: [
          { label: 'OPTICAL', value: 'Landsat 7/8/9 Surface Reflectance · Sentinel-2 multispectral imagery' },
          { label: 'SAR', value: 'Sentinel-1 backscatter observations' },
          { label: 'LAND-COVER REFERENCE', value: 'Dynamic World land-cover probability' },
        ],
      },
      {
        icon: '📅',
        title: 'TEMPORAL COVERAGE',
        desc: 'Annual observations covering long-term land-use history from 2000–2025.',
        fields: [
          { label: 'STUDY PERIOD', value: '2000–2025' },
          { label: 'TEMPORAL UNIT', value: 'Annual observations and yearly composites' },
          { label: 'HISTORICAL BACKBONE', value: 'Landsat time series' },
          { label: 'RECENT ENRICHMENT', value: 'Sentinel-1, Sentinel-2 and Dynamic World' },
        ],
      },
      {
        icon: '🗂️',
        title: 'SPATIAL RESOLUTION',
        desc: 'Input observations at 10–30 m spatial resolution.',
        fields: [
          { label: 'LANDSAT', value: '30 m' },
          { label: 'SENTINEL-1', value: '10 m' },
          { label: 'SENTINEL-2', value: '10–20 m for primary analysis bands' },
          { label: 'DYNAMIC WORLD', value: '10 m' },
          { label: 'ANALYSIS / EXPORT GRID', value: '30 m' },
        ],
      },
      {
        icon: '⚙️',
        title: 'PREPROCESSING',
        desc: 'Standardized multi-sensor observations for consistent time-series analysis.',
        fields: [
          { label: 'QUALITY CONTROL', value: 'Cloud and cloud-shadow masking' },
          { label: 'COMPOSITING', value: 'Annual image composites' },
          { label: 'HARMONIZATION', value: 'Sensor and band standardization' },
          { label: 'TEMPORAL ALIGNMENT', value: 'Yearly observation alignment' },
          { label: 'SPATIAL ALIGNMENT', value: 'Common projection, extent and analysis grid' },
        ],
      },
    ],
  },
  {
    num: '02',
    icon: '📈',
    title: 'FEATURES',
    summary: 'NBR · SAR · GLCM texture · LandTrendr · CCDC',
    caption:
      'Two independent LandTrendr runs (annual NDVI and dry-season NBR) plus CCDC give complementary views of change, while GLCM texture and SAR backscatter add structural and moisture signals.',
    details: [
      {
        icon: '🌈',
        title: 'SPECTRAL INDICES',
        desc: 'Burn-ratio and radar signals capture vegetation and moisture change.',
        fields: [
          { label: 'NBR', value: 'Normalized Burn Ratio, dry-season only (Nov 1 – May 31)' },
          { label: 'SAR', value: 'Sentinel-1 VH backscatter and VH/VV ratio' },
        ],
      },
      {
        icon: '🧩',
        title: 'TEXTURE METRICS',
        desc: 'GLCM texture describes surface roughness and pattern uniformity.',
        fields: [
          { label: 'LANDSAT NDVI (2000–2025)', value: 'Variance · entropy · contrast · homogeneity' },
          { label: 'SENTINEL-2 NDVI (recent 5 yr)', value: 'Same 4 metrics at finer resolution' },
        ],
      },
      {
        icon: '📉',
        title: 'TREND ALGORITHMS',
        desc: 'Two independent segmentation algorithms flag abrupt and gradual change.',
        fields: [
          { label: 'LANDTRENDR — NDVI', value: 'Annual, full-year composites (vegetation trend/slope)' },
          { label: 'LANDTRENDR — NBR', value: 'Dry-season only, run separately — feeds YOD and duration' },
          { label: 'CCDC', value: 'NDVI / NDMI / NBR2 continuous monitoring — RMSE and break metrics' },
        ],
      },
      {
        icon: '⏱️',
        title: 'CHANGE DYNAMICS',
        desc: 'Derived metrics summarize the size, speed, and persistence of detected change.',
        fields: [
          { label: 'MAGNITUDE & SLOPE', value: 'Size and rate of the NBR/NDVI segment change' },
          { label: 'DURATION', value: 'Years elapsed since the detected break' },
          { label: 'BASELINE LEVEL', value: 'Pre-disturbance reflectance level' },
        ],
      },
    ],
  },
  {
    num: '03',
    icon: '🌳',
    title: 'DETECTION & CLASSIFICATION',
    summary: 'Dynamic World filter · Gate logic · RF Binary + Type (C1/C2)',
    caption:
      'Multi-layer land-cover filtering and ~20 tunable thresholds narrow the candidate area before two successive Random Forest models classify it.',
    details: [
      {
        icon: '🗺️',
        title: 'LAND-COVER PRE-FILTER',
        desc: 'Dynamic World probabilities exclude land that was never active cropland.',
        fields: [
          { label: 'NOT FOREST', value: 'Low tree-cover probability (mid- and recent-period)' },
          { label: 'NOT URBAN', value: 'Low built-up probability (2015–2025)' },
          { label: 'NOT ACTIVE CROP', value: 'Low recent cropland frequency/probability' },
          { label: 'NO-AGRICULTURE MASK', value: 'SAR VH + red-band reflectance thresholds' },
        ],
      },
      {
        icon: '🚦',
        title: 'GATE LOGIC',
        desc: 'A rule-based candidate mask combining roughly 20 tunable spectral, SAR and duration thresholds.',
        fields: [
          { label: 'DURATION', value: '> 3 years since the detected break' },
          { label: 'MAGNITUDE & SLOPE', value: 'Minimum NBR/NDVI segment change and trend' },
          { label: 'SPECTRAL & SAR', value: 'NDVI, NDMI, LandTrendr prevalence, SAR thresholds' },
          { label: 'MATURE-SHRUB CRITERIA', value: 'Texture, SAR, and NDVI ranges for regrowth (C2)' },
        ],
      },
      {
        icon: '🌲',
        title: 'RF BINARY MODEL',
        desc: 'Random Forest, round 1 — abandoned vs. still-active land.',
        fields: [
          { label: 'MODEL', value: 'smileRandomForest, 150 trees' },
          { label: 'OUTPUT', value: 'Binary class + per-pixel probability' },
        ],
      },
      {
        icon: '🏷️',
        title: 'TYPE MODEL',
        desc: 'Random Forest, round 2 — runs only on pixels already flagged as abandoned.',
        fields: [
          { label: 'SCOPE', value: 'Abandoned pixels from the binary model only' },
          { label: 'CLASSES', value: 'C1 field crops vs. C2 shrub encroachment' },
        ],
      },
    ],
  },
  {
    num: '04',
    icon: '⚙️',
    title: 'VALIDATION & REFINEMENT',
    summary: 'Accuracy assessment · Error analysis · Threshold refinement',
    caption: 'Regional evaluation results feed back into gate-logic and threshold tuning.',
    details: [
      { icon: '🎯', title: 'ACCURACY ASSESSMENT', desc: 'Precision · misclassification tracking' },
      { icon: '🔍', title: 'ERROR ANALYSIS', desc: 'Region-by-region breakdown (C / N / E / NE1 / NE2 / W / S)' },
      { icon: '🎚️', title: 'THRESHOLD REFINEMENT', desc: 'Iterative gate-logic tuning' },
      { icon: '🔁', title: 'ITERATION CYCLE', desc: 'Previous → Review → Error analysis → Refinement' },
    ],
  },
]

function MethodScene() {
  const [expanded, setExpanded] = useState<string | null>(null)

  function toggleStep(num: string) {
    setExpanded((cur) => (cur === num ? null : num))
  }

  return (
    <div className="scene-pad two-col">
      <div className="col-left">
        <div className="eyebrow-label">METHODOLOGY</div>
        <h1 className="scene-title">Methodology</h1>

        <div className="panel-title">Detection Logic</div>
        <div className="flow-mini-row">
          <div className="flow-mini-card">
            <div className="flow-mini-title">Satellite time series</div>
            <div className="flow-mini-sub">2000–2025</div>
          </div>
          <div className="flow-mini-arrow">→</div>
          <div className="flow-mini-card">
            <div className="flow-mini-title">Land-use History</div>
          </div>
          <div className="flow-mini-arrow">→</div>
          <div className="flow-mini-card">
            <div className="flow-mini-title">Continuous Non-use</div>
            <div className="flow-mini-sub">&gt; 3 years</div>
          </div>
          <div className="flow-mini-arrow">→</div>
          <div className="flow-mini-card highlight">
            <div className="flow-mini-title">Spatial outputs</div>
          </div>
        </div>

        <div className="version-track">
          <span className="version-chip">Previous</span>
          <span>· · · Review · · ·</span>
          <span>· · · Error analysis · · ·</span>
          <span>· · · Refinement · · ·</span>
          <span className="version-chip highlight">Current</span>
        </div>

        <div className="panel-title" style={{ marginTop: 20 }}>
          Model Outputs
        </div>
        <div className="output-grid">
          {['Binary', 'Probability', 'YOD', 'Duration', 'Type'].map((o) => (
            <div className="output-card" key={o}>
              <div className="output-name">{o}</div>
              <div className="output-swatch" />
            </div>
          ))}
        </div>
        <div className="legend-inline">
          <span><span className="dot c1" /> C1: Abandoned field crops</span>
          <span><span className="dot c2" /> C2: Shrub encroachment</span>
        </div>

        <div className="bottom-row-method">
        <div className="eval-card">
          <div className="panel-title">Evaluation Results</div>

          <div className="eval-section-label">National Performance Summary</div>
          <div className="kpi-row">
            <div className="kpi-card">
              <div className="kpi-label"><span className="dot c1" /> PRECISION</div>
              <div className="kpi-value good">83.3%</div>
              <div className="kpi-sub">Current main result</div>
              <div className="kpi-ref">
                Historical reference: 70.9% <span className="kpi-delta good">+12.4 percentage points</span>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label"><span className="dot c2" /> NON-ABANDONED MISCLASSIFICATION</div>
              <div className="kpi-value good">8.7%</div>
              <div className="kpi-sub">Current main result</div>
              <div className="kpi-ref">
                Historical reference: 71.0% <span className="kpi-delta good">−62.3 percentage points</span>
              </div>
            </div>
          </div>
          <p className="stat-sub">
            Source: Project Summary / Before-After Evidence · Reference: 920 (AC1 600 + AC0 320)
          </p>
        </div>

        <div className="opendata-card">
          <div className="panel-title">Open Data &amp; Resources</div>
          <p className="stat-sub">Reusable scripts, documentation and sample spatial outputs.</p>
          <div className="opendata-grid">
            {OPEN_DATA_LINKS.map((item) => (
              <a className="opendata-item" href={item.href} target="_blank" rel="noopener noreferrer" key={item.label}>
                <span className="opendata-icon">{item.icon}</span>
                <span className="opendata-label">{item.label}</span>
                <span className="opendata-arrow">›</span>
              </a>
            ))}
          </div>
          <a
            className="cta-button full opendata-cta"
            href={GH_REPO}
            target="_blank"
            rel="noopener noreferrer"
          >
            EXPLORE OPEN RESOURCES ↗
          </a>
        </div>
        </div>
      </div>

      <div className="col-right">
        <div className="panel-title">Processing Workflow</div>
        <div className="workflow-list">
          {WORKFLOW_STEPS.map((step) => {
            const isOpen = expanded === step.num
            return (
              <div className={`workflow-item ${isOpen ? 'expanded' : ''}`} key={step.num}>
                <button type="button" className="workflow-header" onClick={() => toggleStep(step.num)}>
                  <span className="workflow-num">{step.num}</span>
                  <span className="workflow-icon">{step.icon}</span>
                  <span className="workflow-headline">
                    <span className="workflow-title">{step.title}</span>
                    <span className="workflow-summary">{step.summary}</span>
                  </span>
                  <span className="workflow-chevron">{isOpen ? '⌃' : '›'}</span>
                </button>
                {isOpen && (
                  <div className="workflow-body">
                    <div className="workflow-detail-grid">
                      {step.details.map((d) => (
                        <div className="workflow-detail-card" key={d.title}>
                          <div className="workflow-detail-icon">{d.icon}</div>
                          <div className="workflow-detail-title">{d.title}</div>
                          <div className="workflow-detail-desc">{d.desc}</div>
                          {d.fields && (
                            <div className="workflow-detail-fields">
                              {d.fields.map((f) => (
                                <div className="workflow-detail-field" key={f.label}>
                                  <span className="workflow-detail-field-label">{f.label}</span>
                                  <span className="workflow-detail-field-value">{f.value}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="workflow-caption">{step.caption}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <p className="workflow-hint">ⓘ Hover to preview · Click to explore</p>
      </div>
    </div>
  )
}

export default MethodScene
