import WorkflowConnection from '../components/WorkflowConnection'
import ProcessingDiagram from './ProcessingDiagram'
import FlowArrow from '../components/FlowArrow'
import EvidenceJourney from '../components/EvidenceJourney'
import { useState } from 'react'
import LineIcon from '../components/LineIcon'
import { Contours, MethodVisual } from './MethodVisuals'
import type { VisualKind } from './MethodVisuals'
import './MethodScene.css'
import './MethodLayout.css'

type StageCard = { visual: VisualKind; title: string; labels: string[] }
type Script = { tab: string; file: string; tag: string; code: string; caption: string }
const stages: { title: string; icon: string; summary: string; description: string; cards: StageCard[]; facts: { icon: string; title: string; copy: string }[]; note: string; scripts: Script[] }[] = [
  {
    title: 'DATA', icon: 'layers', summary: 'Landsat 7/8/9 · Sentinel-1/2 · Dynamic World',
    description: 'Satellite data sources and preprocessing for long-term land-use monitoring.',
    cards: [
      { visual: 'sources', title: 'SATELLITE SOURCES', labels: ['Landsat 7/8/9', 'Sentinel-1/2', 'Dynamic World'] },
      { visual: 'preprocess', title: 'PREPROCESSING', labels: ['Cloud masking', 'Harmonization'] },
      { visual: 'timeline', title: 'TEMPORAL COVERAGE', labels: ['2000 — 2025', 'Annual composites'] },
      { visual: 'grid', title: 'ANALYSIS GRID', labels: ['30 m', 'Common spatial alignment'] },
    ],
    facts: [
      { icon: 'satellite', title: 'Multi-source EO', copy: 'Landsat 7/8/9, Sentinel-1/2, Dynamic World' },
      { icon: 'calendar', title: 'Annual composites', copy: 'Consistent time series for 2000–2025' },
      { icon: 'grid', title: '10–30 m observations', copy: 'Complementary optical and radar observations' },
      { icon: 'layers', title: '30 m standardized output', copy: 'Common analysis grid for all inputs' },
    ],
    note: 'Landsat provides the historical backbone; Sentinel and Dynamic World enrich recent observations.',
    scripts: [
      {
        tab: 'Merge + composite', file: '02_STEP1_FeatureStack.js — LOAD + PREPROCESS', tag: 'Section 2',
        code: `<span class="tok-com">// merge 3 sensors into one continuous record, then
// composite annually (median) — this is what makes
// the 2000–25 window possible</span>
<span class="tok-kw">var</span> l7 = ee.ImageCollection(<span class="tok-str">'LANDSAT/LE07/C02/T1_L2'</span>)
  .filterBounds(roi).filterDate(<span class="tok-str">'2000-01-01'</span>,<span class="tok-str">'2012-12-31'</span>)
  .map(harmonizeL7);
<span class="tok-kw">var</span> l8 = ee.ImageCollection(<span class="tok-str">'LANDSAT/LC08/C02/T1_L2'</span>)
  .filterBounds(roi).filterDate(<span class="tok-str">'2013-01-01'</span>,<span class="tok-str">'2021-12-31'</span>)
  .map(prepareImage);
<span class="tok-kw">var</span> l9 = ee.ImageCollection(<span class="tok-str">'LANDSAT/LC09/C02/T1_L2'</span>)
  .filterBounds(roi).filterDate(<span class="tok-str">'2022-01-01'</span>, CONFIG.endYear+<span class="tok-str">'-12-31'</span>)
  .map(prepareImage);

<span class="tok-kw">var</span> rawCollection = l7.merge(l8).merge(l9).sort(<span class="tok-str">'system:time_start'</span>);

<span class="tok-kw">var</span> annualCollection = ee.ImageCollection(years.map(<span class="tok-kw">function</span>(y) {
  <span class="tok-kw">return</span> rawCollection.filter(ee.Filter.calendarRange(y,y,<span class="tok-str">'year'</span>))
    .<span class="tok-fn">median</span>()
    .set(<span class="tok-str">'system:time_start'</span>, ee.Date.fromYMD(y,7,1).millis());
}));`,
        caption: 'Three sensors are harmonized and merged into one continuous annual record before any feature is computed — this is what makes the 2000–2025 window possible, and why Landsat 7 sets the start year.',
      },
      {
        tab: 'Cloud mask + indices', file: '02_STEP1_FeatureStack.js — prepareImage()', tag: 'Section 2',
        code: `<span class="tok-kw">function</span> <span class="tok-fn">prepareImage</span>(img) {
  <span class="tok-kw">var</span> qa = img.select(<span class="tok-str">'QA_PIXEL'</span>);
  <span class="tok-com">// bits 1/3/4 = dilated cloud, cloud, cloud shadow</span>
  <span class="tok-kw">var</span> cloudMask = qa.bitwiseAnd(1 &lt;&lt; 3).eq(0)
    .and(qa.bitwiseAnd(1 &lt;&lt; 4).eq(0))
    .and(qa.bitwiseAnd(1 &lt;&lt; 1).eq(0));

  <span class="tok-kw">var</span> sr = img.select([<span class="tok-str">'SR_B2'</span>,<span class="tok-str">'SR_B3'</span>,<span class="tok-str">'SR_B4'</span>,<span class="tok-str">'SR_B5'</span>,<span class="tok-str">'SR_B6'</span>,<span class="tok-str">'SR_B7'</span>])
    .multiply(0.0000275).add(-0.2)
    .rename([<span class="tok-str">'Blue'</span>,<span class="tok-str">'Green'</span>,<span class="tok-str">'Red'</span>,<span class="tok-str">'NIR'</span>,<span class="tok-str">'SWIR1'</span>,<span class="tok-str">'SWIR2'</span>]);

  <span class="tok-kw">var</span> ndvi = sr.normalizedDifference([<span class="tok-str">'NIR'</span>,<span class="tok-str">'Red'</span>]).rename(<span class="tok-str">'NDVI'</span>);
  <span class="tok-com">// ... EVI, NDMI, NBR2, BSI, NDBI, TCG, TCW, NIRv</span>

  <span class="tok-kw">return</span> ndvi.addBands([...])
    .updateMask(cloudMask)
    .copyProperties(img, [<span class="tok-str">'system:time_start'</span>]);
}`,
        caption: 'The QA_PIXEL bitmask filters cloud, cloud-shadow and cirrus before any index is computed — skip this and NDVI/NBR come out speckled with cloud-shaped artifacts.',
      },
    ],
  },
  {
    title: 'FEATURES', icon: 'signal', summary: 'NBR · SAR · GLCM texture · LandTrendr · CCDC',
    description: 'Turn satellite observations into measurable signals of land-use change.',
    cards: [
      { visual: 'spectral', title: 'SPECTRAL SIGNALS', labels: ['NDVI · NBR', 'Vegetation & disturbance'] },
      { visual: 'texture', title: 'RADAR & TEXTURE', labels: ['SAR · GLCM', 'Structure & surface pattern'] },
      { visual: 'trend', title: 'TREND ALGORITHMS', labels: ['LandTrendr · CCDC', 'Change through time'] },
      { visual: 'dynamics', title: 'CHANGE DYNAMICS', labels: ['Magnitude · slope', 'Duration since change'] },
    ],
    facts: [
      { icon: 'leaf', title: 'Vegetation history', copy: 'Annual NDVI and dry-season NBR signals' },
      { icon: 'signal', title: 'Radar observations', copy: 'Sentinel-1 VH backscatter and VH/VV ratio' },
      { icon: 'grid', title: 'Texture metrics', copy: 'Variance, entropy, contrast and homogeneity' },
      { icon: 'clock', title: 'Temporal segmentation', copy: 'Identify abrupt and gradual changes' },
    ],
    note: 'Spectral, radar and texture features provide complementary evidence of change and persistence.',
    scripts: [
      {
        tab: 'NBR — dry season', file: '03_STEP2_LandTrendr_NBR.js', tag: 'Full script',
        code: `<span class="tok-kw">var</span> ltgee = require(<span class="tok-str">'users/panitthagee/Bangpu:LandTrendr.js'</span>);

<span class="tok-fn">print</span>(<span class="tok-str">'Season: dry ('</span>, CONFIG.ltStartDay, <span class="tok-str">'-'</span>, CONFIG.ltEndDay, <span class="tok-str">')'</span>);

<span class="tok-com">// dry-season days only — keeps wet-season flooding
// from registering as a false break</span>
<span class="tok-kw">var</span> lt = ltgee.runLT(
  CONFIG.startYear, CONFIG.endYear,
  CONFIG.ltStartDay, CONFIG.ltEndDay,
  roi, <span class="tok-str">'NBR'</span>, [<span class="tok-str">'NBR'</span>], runParams, [<span class="tok-str">'cloud'</span>,<span class="tok-str">'shadow'</span>,<span class="tok-str">'snow'</span>]
);

<span class="tok-kw">var</span> nbrFitted = ltgee.getFittedData(lt, CONFIG.startYear, CONFIG.endYear, <span class="tok-str">'NBR'</span>)
  .divide(1000).clip(roi).toFloat();

<span class="tok-kw">var</span> nbrSegData = ltgee.getSegmentData(lt, <span class="tok-str">'NBR'</span>, <span class="tok-str">'loss'</span>);`,
        caption: 'NBR is segmented on dry-season imagery only — run it on the full year and wet-season flooding registers as a false break that has nothing to do with abandonment.',
      },
      {
        tab: 'CCDC + texture + SAR', file: '02_STEP1_FeatureStack.js — sections 4, 7, 8', tag: '3 signals',
        code: `<span class="tok-com">// CCDC — continuous change detection, no need to
// wait for a segment to close like LandTrendr does</span>
<span class="tok-kw">var</span> ccdcResult = ee.Algorithms.TemporalSegmentation.Ccdc({
  collection: rawCollection.select([<span class="tok-str">'NDVI'</span>,<span class="tok-str">'NDMI'</span>,<span class="tok-str">'NBR2'</span>]),
  breakpointBands: [<span class="tok-str">'NDVI'</span>,<span class="tok-str">'NDMI'</span>,<span class="tok-str">'NBR2'</span>],
  minObservations: 10, chiSquareProbability: 0.99, lambda: 20
});

<span class="tok-com">// Texture (GLCM) — surface roughness from mean NDVI</span>
<span class="tok-kw">var</span> texture = ndviMeanInt.<span class="tok-fn">glcmTexture</span>({size: 3})
  .select([<span class="tok-str">'ndvi_var'</span>,<span class="tok-str">'ndvi_ent'</span>]).rename([<span class="tok-str">'tex_var'</span>,<span class="tok-str">'tex_ent'</span>]);

<span class="tok-com">// SAR (Sentinel-1) — radar signal, unaffected by cloud</span>
<span class="tok-kw">var</span> sar = ee.ImageCollection(<span class="tok-str">'COPERNICUS/S1_GRD'</span>)
  .filterBounds(roi)
  .filter(ee.Filter.eq(<span class="tok-str">'instrumentMode'</span>,<span class="tok-str">'IW'</span>))
  .select([<span class="tok-str">'VV'</span>,<span class="tok-str">'VH'</span>]).mean();
<span class="tok-kw">var</span> sarVH = sar.select(<span class="tok-str">'VH'</span>).rename(<span class="tok-str">'sar_vh'</span>);`,
        caption: 'Three signals that never depend on LandTrendr closing a segment — CCDC catches change earlier, texture measures surface roughness, and SAR keeps working straight through cloud cover.',
      },
    ],
  },
  {
    title: 'DETECTION & CLASSIFICATION', icon: 'chip', summary: 'Dynamic World filter · Gate logic · RF Binary · Type C1/C2',
    description: 'Narrow candidate pixels, identify abandonment and classify the resulting land type.',
    cards: [
      { visual: 'filter', title: 'CANDIDATE MASK', labels: ['Dynamic World filter', 'Land-cover screening'] },
      { visual: 'gate', title: 'GATE LOGIC', labels: ['Spectral & SAR rules', 'Duration thresholds'] },
      { visual: 'forest', title: 'BINARY + PROBABILITY', labels: ['Random Forest', 'Abandoned / non-abandoned'] },
      { visual: 'types', title: 'TYPE CLASSIFICATION', labels: ['C1 · Abandoned field crops', 'C2 · Shrub encroachment'] },
    ],
    facts: [
      { icon: 'layers', title: 'Land-cover pre-filter', copy: 'Screen forest, urban and active cropland signals' },
      { icon: 'chip', title: 'Rule-based candidates', copy: 'Combine spectral, radar and temporal thresholds' },
      { icon: 'branch', title: 'Two successive models', copy: 'RF binary detection, then C1/C2 classification' },
      { icon: 'pin', title: 'Five spatial outputs', copy: 'Binary, probability, YOD, duration and type' },
    ],
    note: 'The type model runs only on pixels identified as abandoned by the binary model.',
    scripts: [
      {
        tab: 'Candidate mask', file: '04_STEP3_Classification.js — Section 4', tag: 'Dynamic World',
        code: `<span class="tok-kw">var</span> dwRecent = ee.ImageCollection(<span class="tok-str">'GOOGLE/DYNAMICWORLD/V1'</span>)
  .filterBounds(roi).filterDate(<span class="tok-str">'2021-01-01'</span>,<span class="tok-str">'2025-12-31'</span>);

<span class="tok-com">// notForest — low tree probability, mid & recent window</span>
<span class="tok-kw">var</span> notForest = dwTreeProb.lt(0.30).and(dwTreeProb5yr.lt(0.25));

<span class="tok-com">// notUrban — low built probability across 2015–2025</span>
<span class="tok-kw">var</span> notUrban = dwBuiltLong.lt(0.20);

<span class="tok-com">// notActiveCrop — not a continuously working cropland</span>
<span class="tok-kw">var</span> notActiveCrop = hasHighCrop.lt(17).and(dwCropMean.lt(0.30));`,
        caption: 'Forest, urban and active cropland are screened out before anything reaches Gate Logic — fewer pixels to classify, and fewer false positives from land that was never a candidate.',
      },
      {
        tab: 'Gate logic + type model', file: '04_STEP3_Classification.js — Sections 5, 10', tag: 'C1/C2 · RF round 2',
        code: `<span class="tok-com">// Gate Logic — path C1, classic abandoned cropland</span>
<span class="tok-kw">var</span> isClassicAbandon = allFeatures.select(<span class="tok-str">'mag'</span>).gt(CONFIG.magThreshold)
  .and(allFeatures.select(<span class="tok-str">'slope'</span>).abs().lt(CONFIG.slopeThreshold))
  .and(allFeatures.select(<span class="tok-str">'duration'</span>).gt(CONFIG.durationMin))
  .and(allFeatures.select(<span class="tok-str">'numBreaks'</span>).lt(CONFIG.maxBreaks));

<span class="tok-com">// path C2, shrub encroachment</span>
<span class="tok-kw">var</span> isMatureShrub = allFeatures.select(<span class="tok-str">'tex_ent'</span>).gt(CONFIG.matureShrubTexEnt)
  .and(allFeatures.select(<span class="tok-str">'sar_vh'</span>).lt(CONFIG.matureShrubSAR))
  .and(allFeatures.select(<span class="tok-str">'seasonal_amp'</span>).lt(CONFIG.matureShrubAmp));

<span class="tok-com">// RF round 2 — type, only on confirmed-abandoned pixels</span>
<span class="tok-kw">var</span> abandonedPixels = featuresMasked.select(featureBandList)
  .updateMask(abandonProb.gt(0.70));
<span class="tok-kw">var</span> classified3 = abandonedPixels.<span class="tok-fn">classify</span>(classifier3).rename(<span class="tok-str">'abandon_type'</span>);`,
        caption: 'Type classification only runs on pixels the binary model already scored above 0.70 — the two models answer two different questions, so each gets its own feature set and threshold.',
      },
    ],
  },
  {
    title: 'VALIDATION & REFINEMENT', icon: 'target', summary: 'Accuracy assessment · Error analysis · Threshold refinement',
    description: 'Compare predictions with reference evidence and feed observed errors back into the model.',
    cards: [
      { visual: 'accuracy', title: 'ACCURACY ASSESSMENT', labels: ['Precision tracking', 'Reference evidence'] },
      { visual: 'errors', title: 'ERROR ANALYSIS', labels: ['Regional breakdown', 'False-positive patterns'] },
      { visual: 'tuning', title: 'THRESHOLD REFINEMENT', labels: ['Gate-logic tuning', 'Review observed errors'] },
      { visual: 'cycle', title: 'ITERATION CYCLE', labels: ['Review → refine', 'Reassess performance'] },
    ],
    facts: [
      { icon: 'people', title: '920 reference samples', copy: 'AC1: 600 samples · AC0: 320 samples' },
      { icon: 'target', title: '83.3% precision', copy: 'Current national performance snapshot' },
      { icon: 'search', title: '8.7% misclassification', copy: 'Non-abandoned land classified as abandoned' },
      { icon: 'shield', title: 'Evidence-led refinement', copy: 'Regional error review informs threshold tuning' },
    ],
    note: 'Evaluation snapshots use different sample sets; they are not a matched-sample comparison.',
    scripts: [
      {
        tab: 'Accuracy assessment', file: '04_STEP3_Classification.js — Section 13', tag: 'Holdout 30%',
        code: `<span class="tok-kw">var</span> validated = classifiedMMU.sampleRegions({
  collection: valData, properties: [<span class="tok-str">'class'</span>],
  scale: CONFIG.scale, tileScale: 8
});

<span class="tok-kw">var</span> valMatrix = validated.<span class="tok-fn">errorMatrix</span>(<span class="tok-str">'class'</span>, <span class="tok-str">'land_class'</span>);
<span class="tok-fn">print</span>(<span class="tok-str">'=== Validation (holdout 30%) ==='</span>);
<span class="tok-fn">print</span>(<span class="tok-str">'Confusion matrix:'</span>, valMatrix);`,
        caption: 'Accuracy is measured on a 30% holdout the model never saw during training — 920 reference samples in the current run (AC1 600 + AC0 320).',
      },
    ],
  },
]
const exportScript: Script = {
  tab: 'Export', file: '04_STEP3_Classification.js — Export', tag: 'toDrive / toAsset',
  code: `<span class="tok-kw">function</span> <span class="tok-fn">prepExport</span>(img, castType) {
  <span class="tok-kw">var</span> out = img.clip(roi).unmask(0);
  <span class="tok-kw">if</span> (castType === <span class="tok-str">'byte'</span>)  <span class="tok-kw">return</span> out.toByte();
  <span class="tok-kw">if</span> (castType === <span class="tok-str">'int16'</span>) <span class="tok-kw">return</span> out.toInt16();
  <span class="tok-kw">return</span> out;
}

Export.image.<span class="tok-fn">toDrive</span>({
  image: prepExport(classifiedMMU,<span class="tok-str">'byte'</span>),
  description: exportName + <span class="tok-str">'_binary'</span>,
  folder: CONFIG.exportFolder, region: roi,
  scale: CONFIG.scale, crs: <span class="tok-str">'EPSG:4326'</span>, maxPixels: 1e10
});

<span class="tok-com">// fastest option if the result feeds straight back into GEE</span>
Export.image.<span class="tok-fn">toAsset</span>({
  image: abandonProb.clip(roi).toFloat(),
  description: exportName + <span class="tok-str">'_prob_asset'</span>,
  assetId: <span class="tok-str">'projects/' + GEE_PROJECT + '/assets/abandon_prob_' + REGION_NAME</span>,
  region: roi, scale: CONFIG.scale, crs: <span class="tok-str">'EPSG:4326'</span>, maxPixels: 1e10
});`,
  caption: 'toDrive exports a GeoTIFF for use outside GEE; toAsset is the fast path when the very next step is more processing inside GEE — no download/re-upload round trip.',
}
const outputs: { title: string; visual: VisualKind; copy: string }[] = [
  { title: 'Binary', visual: 'binary', copy: 'Abandoned / non-abandoned mask' },
  { title: 'Probability', visual: 'probability', copy: 'Per-pixel probability (0–1)' },
  { title: 'YOD', visual: 'yod', copy: 'Year of detected disturbance (YOD)' },
  { title: 'Duration', visual: 'duration', copy: 'Estimated duration since detected change (years)' },
  { title: 'Type', visual: 'types', copy: 'Abandoned land classification (C1 / C2)' },
]
const detectionLogic = [
  { icon: 'satellite', title: 'Satellite time series', copy: '2000\u20132025', stage: 0, connection: 'Prepare annual satellite observations on a common analysis grid.' },
  { icon: 'layers', title: 'Land-use history', copy: 'Previously used', stage: 1, connection: 'Extract temporal features to reconstruct past use and detect changes.' },
  { icon: 'clock', title: 'Continuous non-use', copy: '\u2265 5 years', stage: 2, connection: 'Review persistent non-use with candidate rules and classification. The five-year definition is distinct from individual model thresholds.' },
  { icon: 'pin', title: 'Spatial outputs', copy: 'Validate & review', stage: 3, connection: 'Validate the classified outputs against reference evidence and refine the model.' },
]
const repo = 'https://github.com/sr120899/ABANDONED_LAND_DETECTION'
const resources = [
  { icon: 'code', title: 'GEE Scripts', copy: 'Analysis scripts for Google Earth Engine', path: 'tree/main/SCRIPT' },
  { icon: 'search', title: 'User Guide', copy: 'Methodology, data and workflow', path: 'blob/main/SCRIPT/AbandonedLandDetection_User%20Manual.pdf' },
  { icon: 'layers', title: 'Raster Outputs', copy: 'Sample spatial outputs (GeoTIFF)', path: 'tree/main/DATA/PROVINCE_CLIPS' },
  { icon: 'database', title: 'Sample Data', copy: 'Example inputs and reference data', path: 'tree/main/DATA/DATA_CASE%20STUDY' },
]
function ScriptToggle({ open, onClick, label, count }: { open: boolean; onClick: () => void; label: string; count?: number }) {
  return <button type="button" className="script-toggle" aria-expanded={open} onClick={onClick}>
    <LineIcon name="code" />{open ? `Hide ${label}` : `View ${label}`}{count && count > 1 ? ` (${count})` : ''}<LineIcon name="chevron" />
  </button>
}
function ScriptBox({ scripts, activeTab, onTab, onClose }: { scripts: Script[]; activeTab: number; onTab: (i: number) => void; onClose: () => void }) {
  const active = scripts[activeTab] ?? scripts[0]
  return <div className="script-box">
    {scripts.length > 1 && <div className="sb-tabs">{scripts.map((s, i) => <button key={s.tab} type="button" className={i === activeTab ? 'active' : ''} onClick={() => onTab(i)}>{s.tab}</button>)}</div>}
    <div className="sb-head"><span className="sbdots"><i /><i /><i /></span><span className="sb-file">{active.file}</span><span className="sb-tag">{active.tag}</span><button type="button" className="sb-close" aria-label="Close script" onClick={onClose}>✕</button></div>
    <pre dangerouslySetInnerHTML={{ __html: active.code }} />
    <div className="sb-caption"><b>Why: </b>{active.caption}</div>
  </div>
}
function ComparisonChart({ previous, current, decrease = false }: { previous: number; current: number; decrease?: boolean }) {
  return <div className={`metric-comparison ${decrease ? 'decrease' : ''}`} role="img" aria-label={`Historical ${previous} percent; current ${current} percent. Shared scale from zero to 100 percent.`}>
    {[{label:'Historical',value:previous},{label:'Current',value:current}].map(row=><div className="metric-bar-row" key={row.label}><span>{row.label}</span><div className="metric-bar-track"><i style={{width: `${row.value}%`}}/></div><b>{row.value.toFixed(1)}%</b></div>)}
    <div className="metric-scale"><span>0%</span><span>100%</span></div>
  </div>
}
export default function MethodScene() {
  const [stage, setStage] = useState<number | null>(null)
  const [openScript, setOpenScript] = useState<Record<number, boolean>>({})
  const [scriptTab, setScriptTab] = useState<Record<number, number>>({})
  const [outputsScriptOpen, setOutputsScriptOpen] = useState(false)
  function selectStage(next: number) { setStage(current => current === next ? null : next) }
  function toggleScript(i: number) { setOpenScript(s => ({ ...s, [i]: !s[i] })) }
  function closeScript(i: number) { setOpenScript(s => ({ ...s, [i]: false })) }
  function setTab(i: number, t: number) { setScriptTab(s => ({ ...s, [i]: t })) }
  return <div className="method-v2 method-visual-page">
    <section className="method-hero">
      <Contours />
      <div className="method-hero-copy">
        <span>02 / METHODOLOGY</span>
        <h1>From satellite signals<br />to <em>spatial intelligence.</em></h1>
        <p>Connecting Earth observations, land-use history and machine learning to identify areas for review.</p>
        <div className="source-pills"><i><LineIcon name="layers" />Landsat 7/8/9</i><i><LineIcon name="signal" />Sentinel-1/2</i><i><LineIcon name="grid" />Dynamic World</i></div>
      </div>
      <figure className="method-hero-story" aria-label="Satellite observations become change signals and classified spatial outputs">
        <figcaption><span>THE EVIDENCE PATH</span><b>Observe the land. Reveal the change.</b></figcaption>
        <div className="hero-evidence-steps">
          <div><MethodVisual kind="sources"/><span>OBSERVATIONS</span><b>Read the landscape</b></div>
          <div><MethodVisual kind="trend"/><span>CHANGE SIGNALS</span><b>Trace its history</b></div>
          <div><MethodVisual kind="types"/><span>SPATIAL OUTPUTS</span><b>Locate candidates</b></div>
        </div>
        <p>Satellite time series &rarr; change detection &rarr; areas for review</p>
      </figure>
      <dl className="method-stats"><div><dt>OBSERVATION PERIOD</dt><dd>2000 — 2025</dd></div><div><dt>ANALYSIS GRID</dt><dd>30 <small>m</small></dd></div><div><dt>PROCESSING</dt><dd>4 <small>stages</small></dd></div></dl>
    </section>

    <EvidenceJourney />
    <section className="method-glance">
      <Contours />
      <header><h2>METHOD AT A GLANCE</h2><p>Each processing stage is linked to the evidence and outputs it produces.</p></header>
      <div className="method-linked-layout">
        <WorkflowConnection stage={stage}/>
        <div className="method-logic-column">
          <div className="logic-side"><h3>DETECTION LOGIC</h3><div className="logic-row logic-vertical">
            {detectionLogic.map(item => <button type="button" key={item.title} className={stage === item.stage ? 'linked' : ''} aria-expanded={stage === item.stage} aria-controls={`method-detail-${item.stage}`} onClick={() => selectStage(item.stage)}><LineIcon name={item.icon} /><b>{item.title}</b><small>{item.copy}</small><span className="logic-stage-label">Stage 0{item.stage + 1}</span><span className="logic-arrow" aria-hidden="true"><FlowArrow/></span></button>)}
          </div></div>

        </div>
        <div className="method-flow-rail" aria-hidden="true">{stages.map((item, i) => <span key={item.title} className={stage === i ? 'active' : ''}>0{i + 1}</span>)}</div>
        <div className="method-workflow-explorer">
          <header className="visual-workflow-heading"><h3>PROCESSING WORKFLOW</h3><span>FROM SATELLITE DATA TO ACTIONABLE INSIGHTS</span></header>
          <div className="workflow-stage-tabs" aria-label="Processing stages">
            {stages.map((item, i) => <button key={item.title} type="button" id={`method-stage-${i}`} aria-expanded={stage === i} aria-controls={`method-detail-${i}`} aria-label={`${item.title} \u2014 ${item.summary}`} className={stage === i ? 'active' : ''} onClick={() => selectStage(i)}>
              <span className="stage-number">0{i + 1}</span><LineIcon name={item.icon} />
              <b>{item.title}</b>
              <span className="stage-active-label">{stage === i ? 'ACTIVE' : '\u203a'}</span>
            </button>)}
          </div>
          {stage !== null && <p className="method-connection" role="status"><b>{detectionLogic[stage].title} &rarr; {stages[stage].title}</b><span>{detectionLogic[stage].connection}</span></p>}
          {stages.map((item, i) => <div key={item.title} id={`method-detail-${i}`} role="region" aria-labelledby={`method-stage-${i}`} hidden={stage !== i} className="method-process-expanded">
            <div className="workflow-detail-panel">
              <div className="workflow-detail-main">
                <header><span className="stage-number">0{i + 1}</span><div><h3>{item.title}</h3><p>{item.description}</p></div><ScriptToggle open={!!openScript[i]} onClick={() => toggleScript(i)} label="GEE script" count={item.scripts.length} /></header>
                <ProcessingDiagram stage={i}/>
                <div className={`script-panel${openScript[i] ? ' open' : ''}`}><ScriptBox scripts={item.scripts} activeTab={scriptTab[i] ?? 0} onTab={t => setTab(i, t)} onClose={() => closeScript(i)} /></div>
              </div>
              <aside className="workflow-summary"><header><LineIcon name={item.icon} /><div><h3>{['DATA', 'FEATURE', 'MODEL', 'VALIDATION'][i]} SUMMARY</h3><p>Key characteristics of this processing stage.</p></div></header>{item.facts.map(fact => <article key={fact.title}><LineIcon name={fact.icon} /><div><b>{fact.title}</b><p>{fact.copy}</p></div></article>)}</aside>
            </div>
            {i === 3 && (
    <section className="method-evaluation stage-evaluation" aria-labelledby="stage-evaluation-title">
      <header className="evaluation-heading"><div><span className="evaluation-kicker">04 / VALIDATION &amp; REFINEMENT</span><h2 id="stage-evaluation-title">EVALUATION RESULTS</h2><p>National performance snapshots</p></div><span className="evaluation-badge"><LineIcon name="shield"/>Reference-based assessment</span></header>
      <div className="evaluation-grid">
        <article className="metric-card precision"><header><span className="metric-symbol"><LineIcon name="target"/></span><div><h3>Precision</h3><p>Higher is better</p></div></header><div className="metric-value"><b>83.3<span>%</span></b><span className="metric-delta">+12.4 pp<small>vs. historical reference</small></span></div><ComparisonChart previous={70.9} current={83.3}/></article>
        <article className="metric-card misclassification"><header><span className="metric-symbol"><LineIcon name="shield"/></span><div><h3>Non-abandoned misclassification</h3><p>Lower is better</p></div></header><div className="metric-value"><b>8.7<span>%</span></b><span className="metric-delta">&minus;62.3 pp<small>vs. historical reference</small></span></div><ComparisonChart previous={71} current={8.7} decrease/></article>
      </div>
      <aside className="evaluation-context"><LineIcon name="bulb"/><div><b>How to read these results</b><p>Different evaluation sets and sample sizes were used. These are performance snapshots, not a matched-sample comparison.</p><small>Source: Project Summary / Before&ndash;After Evidence &middot; Reference: 920 (AC1 600 + AC0 320)</small></div></aside>
    </section>
            )}
            {i !== 3 && <footer className="workflow-insight"><div><LineIcon name="bulb" /><p>{item.note}</p></div><small>Select a stage to explore its data and processing details.<span>Process illustrations are schematic.</span></small></footer>}
          </div>)}
          {stage === null && <div className="method-process-prompt"><LineIcon name="layers" /><p>Select a detection-logic step or processing stage to explore the connected evidence.</p></div>}
        </div>
      </div>
    </section>

    <section className={`method-output-section ${stage === 2 || stage === 3 ? 'linked-section' : ''}`}>
      <Contours /><header><div><h2>MODEL OUTPUTS</h2><small>Produced by Detection & Classification (Stage 03)</small></div><ScriptToggle open={outputsScriptOpen} onClick={() => setOutputsScriptOpen(o => !o)} label="export script" /></header>
      <div className={`script-panel${outputsScriptOpen ? ' open' : ''}`}><ScriptBox scripts={[exportScript]} activeTab={0} onTab={() => {}} onClose={() => setOutputsScriptOpen(false)} /></div>
      <div className="outputs-with-map"><div><div className="method-output-grid">{outputs.map(item => <article key={item.title}><b>{item.title}</b><MethodVisual kind={item.visual} /><small>{item.copy}</small></article>)}</div><div className="class-legend"><span><i className="c1" />C1 · Abandoned field crops</span><span><i className="c2" />C2 · Shrub encroachment</span></div></div></div>
    </section>



    <section className="method-resources">
      <header><h2>OPEN DATA & RESOURCES</h2><p>Reusable scripts, documentation and sample spatial outputs.</p></header>
      <div className="resource-grid">{resources.map(item => <a key={item.title} href={`${repo}/${item.path}`} target="_blank" rel="noopener noreferrer"><LineIcon name={item.icon} /><b>{item.title}</b><small>{item.copy}</small><LineIcon name="arrow" /></a>)}</div>
      <a className="resource-cta" href={repo} target="_blank" rel="noopener noreferrer"><LineIcon name="code" /><b>EXPLORE OPEN RESOURCES ↗</b><span>Open source for a more sustainable Thailand</span></a>
    </section>
  </div>
}
