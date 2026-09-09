import LineIcon from './LineIcon'

interface ChromeProps {
  step: number
  onStepChange: (step: number) => void
  onBack?: () => void
  footerNote?: string
  children: React.ReactNode
}

const TOP_TABS: { label: string; step: number; icon: string }[] = [
  { label: 'CONCEPT', step: 1, icon: '◎' },
  { label: 'METHOD', step: 2, icon: '▤' },
  { label: 'EXPLORE', step: 3, icon: '⬡' },
]

const MAX_STEP = 3

function topTabActive(step: number, tabStep: number) {
  if (tabStep === 3) return step >= 3
  return step === tabStep
}

function Chrome({ step, onStepChange, onBack, footerNote, children }: ChromeProps) {
  return (
    <div className={`app-shell satellite-shell ${step === 1 ? 'concept-shell' : step === 2 ? 'method-shell' : 'explore-shell'}`} style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
      <header className="app-header">
        <div className="brand-block">
          <div className="brand-logo"><LineIcon name="layers" /></div>
          <div>
            <div className="brand-title">
              ABANDONED LAND DETECTION
            </div>
            <div className="brand-subtitle">Monitoring neglected areas for sustainable Thailand</div>
          </div>
        </div>
        <nav className="top-tabs" aria-label="Main navigation">
          {TOP_TABS.map((t) => (
            <button
              key={t.label}
              className={`top-tab ${topTabActive(step, t.step) ? 'active' : ''}`}
              aria-current={topTabActive(step, t.step) ? "page" : undefined}
              onClick={() => onStepChange(t.step)}
            >
              <span className="top-tab-icon"><LineIcon name={t.step === 1 ? "bulb" : t.step === 2 ? "shield" : "layers"} /></span> {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>{children}</main>

      <footer className="app-footer">
        <span className="footer-brand">BY PLOT {'{A2B}'}</span>
        <div className="step-nav">
          <button
            className="step-nav-btn"
            disabled={step <= 1}
            onClick={() => (onBack ? onBack() : onStepChange(Math.max(1, step - 1)))}
          >
            ‹ Back
          </button>
          <div className="step-dots">
            {[1, 2, 3].map((s) => (
              <button key={s} aria-label={TOP_TABS[s - 1].label} aria-current={step === s ? 'page' : undefined} className={`step-dot ${step === s ? 'active' : ''}`} onClick={() => onStepChange(s)}>
                {String(s).padStart(2, '0')}
              </button>
            ))}
          </div>
          <button
            className="step-nav-btn"
            disabled={step >= MAX_STEP}
            onClick={() => onStepChange(Math.min(MAX_STEP, step + 1))}
          >
            Next ›
          </button>
        </div>
        <span className="footer-note">{footerNote || 'TURN SATELLITE DATA INTO A MORE SUSTAINABLE THAILAND'}</span>
      </footer>
    </div>
  )
}

export default Chrome
