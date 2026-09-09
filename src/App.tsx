import { useRef, useState } from 'react'
import './App.css'
import Chrome from './components/Chrome'
import ConceptScene from './scenes/ConceptScene'
import MethodScene from './scenes/MethodScene'
import ExploreScene from './scenes/explore/ExploreScene'
import type { ExploreSceneHandle } from './scenes/explore/ExploreScene'
import './SatelliteTheme.css'
import './NarrativePages.css'

function App() {
  const [step, setStep] = useState(1)
  const exploreRef = useRef<ExploreSceneHandle>(null)

  function handleBack() {
    if (step === 3 && exploreRef.current?.goBack()) return
    setStep((s) => Math.max(1, s - 1))
  }

  return (
    <Chrome
      step={step}
      onStepChange={setStep}
      onBack={handleBack}
      footerNote={step >= 3 ? 'Nominal area estimate (30m). Model classification: C1 + C2.' : ''}
    >
      {step === 1 && <ConceptScene />}
      {step === 2 && <MethodScene />}
      {step === 3 && <ExploreScene ref={exploreRef} />}
    </Chrome>
  )
}

export default App
