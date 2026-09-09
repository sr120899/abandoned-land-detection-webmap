import ValidationSampleCard from './ValidationSampleCard'
import { CASE_ORDER, caseLabel } from '../../utils/caseLabels'

interface Props {
  caseName: string
  onChangeCase: (name: string) => void
  onClose: () => void
}

const CASE_LOCATIONS: Record<string, { amphoe: string; province: string }> = {
  point_1: { amphoe: 'Bang Phi', province: 'Samut Prakarn' },
  point_4: { amphoe: 'Bang Pahan', province: 'Phra Nakhon Si Ayudhya' },
  point_5: { amphoe: 'Bang Sai', province: 'Phra Nakhon Si Ayudhya' },
}

function EvidenceSheet({ caseName, onChangeCase, onClose }: Props) {
  const loc = CASE_LOCATIONS[caseName]

  return (
    <div className="evidence-sheet" role="dialog" aria-modal="true" aria-label={caseLabel(caseName)}>
      <div className="evidence-sheet-header">
        <div className="breadcrumb">
          Central &gt; {loc?.province} &gt; {loc?.amphoe}
        </div>
        <button className="close-btn" onClick={onClose}>
          ✕ Close
        </button>
      </div>

      <div className="pill-tabs small">
        {CASE_ORDER.map((c) => (
          <button key={c} className={c === caseName ? 'active' : ''} onClick={() => onChangeCase(c)}>
            {caseLabel(c)}
          </button>
        ))}
      </div>

      <ValidationSampleCard key={caseName} caseName={caseName} />

      <div className="note-card">
        <strong>Expert interpretation note:</strong> Verify land-use history and persistence before concluding
        abandonment.
      </div>
    </div>
  )
}

export default EvidenceSheet
