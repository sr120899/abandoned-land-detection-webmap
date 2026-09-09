import FlowArrow from '../components/FlowArrow'
import { MethodVisual } from './MethodVisuals'
import type { VisualKind } from './MethodVisuals'
import './ProcessingDiagram.css'

type Node = { title: string; detail: string; visual: VisualKind | 'classes' | 'signals' }
const diagrams: { steps: string[]; input: string; output: string; nodes: Node[] }[] = [
  { steps: ['Satellite sources', 'Preprocessing', 'Annual composites', 'Common grid'], input: 'Multi-source observations', output: 'Aligned annual imagery', nodes: [
    { title: 'Satellite sources', detail: 'Landsat 7/8/9, Sentinel-1/2 and Dynamic World', visual: 'sources' },
    { title: 'Clean & harmonize', detail: 'Mask clouds and standardize observations', visual: 'preprocess' },
    { title: 'Build the time series', detail: 'Annual composites across 2000–2025', visual: 'timeline' },
    { title: 'Align the pixels', detail: 'A shared 30 m analysis grid', visual: 'grid' },
  ]},
  { steps: ['Complementary signals', 'Change through time', 'Feature stack'], input: 'Aligned observations', output: 'Pixel-level model features', nodes: [
    { title: 'Combine evidence', detail: 'Spectral, radar and texture signals provide complementary inputs', visual: 'signals' },
    { title: 'Describe the change', detail: 'LandTrendr / CCDC: timing, magnitude, slope and persistence', visual: 'trend' },
    { title: 'Assemble model inputs', detail: 'Combine temporal and surface features for each pixel', visual: 'sources' },
  ]},
  { steps: ['Dynamic World filter', 'Gate logic', 'RF Binary', 'Type C1/C2'], input: 'Land cover + model features', output: 'Abandonment mask, probability and type', nodes: [
    { title: 'Candidate mask', detail: 'Screen land cover to retain pixels for candidate assessment', visual: 'filter' },
    { title: 'Binary + probability', detail: 'Gate logic narrows candidates; Random Forest estimates abandonment', visual: 'gate' },
    { title: 'Type classification', detail: 'Classify only pixels detected as abandoned', visual: 'classes' },
  ]},
  { steps: ['Reference samples', 'Error analysis', 'Refinement', 'Reassessment'], input: 'Classified outputs + reference evidence', output: 'Reviewed results and model refinements', nodes: [
    { title: 'Assess agreement', detail: 'Compare predictions with reference samples', visual: 'accuracy' },
    { title: 'Locate errors', detail: 'Review omissions and false detections', visual: 'errors' },
    { title: 'Refine thresholds', detail: 'Adjust candidate rules and model settings', visual: 'tuning' },
    { title: 'Reassess results', detail: 'Evaluate the refined outputs against reference evidence', visual: 'cycle' },
  ]},
]
function ClassMap({ code, color, label }: { code: string; color: string; label: string }) {
  return <div className="classification-branch"><svg viewBox="0 0 120 72" fill="none" aria-hidden="true"><path d="M15 5h98v51L98 67H7V17Z" fill="#052d3a" stroke="#70b6c5"/>{Array.from({length:72},(_,i)=><rect key={i} x={18+i%12*7} y={13+Math.floor(i/12)*7} width="4" height="4" fill={(i*17%23)<8?color:'#145060'} opacity={(i*7%11)<7?1:.4}/>)}</svg><div><b style={{color}}>{code}</b><span>{label}</span></div></div>
}
export default function ProcessingDiagram({ stage }: { stage: number }) {
  const diagram = diagrams[stage]
  return <figure className={`processing-diagram processing-diagram-${stage}`} aria-label={`${diagram.input} to ${diagram.output}`}>
    <ol className="processing-sequence">{diagram.steps.map((step,i)=><li key={step}><span>{step}</span>{i<diagram.steps.length-1&&<FlowArrow/>}</li>)}</ol>
    <div className="processing-canvas" style={{'--node-count':diagram.nodes.length} as React.CSSProperties}>
      {diagram.nodes.map((node,i)=><div className="processing-node" key={node.title}>
        <div className="processing-node-art">
          {node.visual==='classes'?<div className="classification-split"><ClassMap code="C1" color="#b0f34c" label="Abandoned field crops"/><ClassMap code="C2" color="#39c4f5" label="Shrub encroachment"/></div>:node.visual==='signals'?<div className="parallel-signals"><div><MethodVisual kind="spectral"/><span>Spectral</span></div><div><MethodVisual kind="texture"/><span>Radar / texture</span></div></div>:<MethodVisual kind={node.visual}/>}
          {i<diagram.nodes.length-1&&<span className="processing-node-link"><FlowArrow/></span>}
        </div>
        <div className="processing-node-caption"><b>{node.title}</b><p>{node.detail}</p></div>
      </div>)}
    </div>
    <div className="processing-endpoints"><span><b>INPUT</b>{diagram.input}</span><FlowArrow/><span><b>OUTPUT</b>{diagram.output}</span></div>
  </figure>
}
