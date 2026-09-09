import FlowArrow from './FlowArrow'
import LineIcon from './LineIcon'

const steps = [
  { icon: 'satellite', title: 'Observe', copy: 'Satellite time series' },
  { icon: 'layers', title: 'Understand', copy: 'Land-use history' },
  { icon: 'chip', title: 'Detect', copy: 'Candidate areas' },
  { icon: 'pin', title: 'Review', copy: 'Spatial evidence' },
]

export default function EvidenceJourney() {
  return <ol className="evidence-journey" aria-label="From observations to spatial evidence">
    {steps.map((step, index) => <li key={step.title}>
      <div className="journey-step"><span className="journey-icon"><LineIcon name={step.icon}/></span>
      <div><span className="journey-number">0{index + 1}</span><b>{step.title}</b><small>{step.copy}</small></div></div>
      {index < steps.length - 1 && <span className="journey-connector"><FlowArrow/></span>}
    </li>)}
  </ol>
}
