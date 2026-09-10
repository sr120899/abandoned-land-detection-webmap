import { useEffect, useRef } from 'react'
import LineIcon from './LineIcon'
import { useLanguage } from '../i18n/LanguageContext'

interface ChromeProps {
  step: number
  onStepChange: (step: number) => void
  onBack?: () => void
  footerNote?: string
  children: React.ReactNode
}

const MAX_STEP = 3

function topTabActive(step: number, tabStep: number) {
  if (tabStep === 3) return step >= 3
  return step === tabStep
}

function Chrome({ step, onStepChange, onBack, footerNote, children }: ChromeProps) {
  const mainRef = useRef<HTMLElement>(null)
  const { t } = useLanguage()

  const topTabs = [
    { label: t('chrome.nav.concept'), step: 1, icon: 'bulb' },
    { label: t('chrome.nav.method'), step: 2, icon: 'shield' },
    { label: t('chrome.nav.explore'), step: 3, icon: 'layers' },
  ]

  // Each scene shares this one scroll container, so switching tabs would
  // otherwise leave the next page scrolled wherever the last one was.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [step])

  return (
    <div className={`app-shell satellite-shell ${step === 1 ? 'concept-shell' : step === 2 ? 'method-shell' : 'explore-shell'}`} style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
      <header className="app-header">
        <div className="brand-block">
          <div className="brand-logo"><LineIcon name="layers" /></div>
          <div>
            <div className="brand-title">
              {t('chrome.brandTitle')}
            </div>
            <div className="brand-subtitle">{t('chrome.brandSubtitle')}</div>
          </div>
        </div>
        <nav className="top-tabs" aria-label="Main navigation">
          {topTabs.map((tab) => (
            <button
              key={tab.label}
              className={`top-tab ${topTabActive(step, tab.step) ? 'active' : ''}`}
              aria-current={topTabActive(step, tab.step) ? "page" : undefined}
              onClick={() => onStepChange(tab.step)}
            >
              <span className="top-tab-icon"><LineIcon name={tab.icon} /></span> {tab.label}
            </button>
          ))}
        </nav>
        {/* Language toggle (EN/TH) is built and translations are in place, just not
            surfaced yet — re-add this block when the Thai version is ready to ship. */}
      </header>

      <main ref={mainRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>{children}</main>

      <footer className="app-footer">
        <span className="footer-brand">BY PLOT {'{A2B}'}</span>
        <div className="step-nav">
          <button
            className="step-nav-btn"
            disabled={step <= 1}
            onClick={() => (onBack ? onBack() : onStepChange(Math.max(1, step - 1)))}
          >
            {t('chrome.back')}
          </button>
          <div className="step-dots">
            {[1, 2, 3].map((s) => (
              <button key={s} aria-label={topTabs[s - 1].label} aria-current={step === s ? 'page' : undefined} className={`step-dot ${step === s ? 'active' : ''}`} onClick={() => onStepChange(s)}>
                {String(s).padStart(2, '0')}
              </button>
            ))}
          </div>
          <button
            className="step-nav-btn"
            disabled={step >= MAX_STEP}
            onClick={() => onStepChange(Math.min(MAX_STEP, step + 1))}
          >
            {t('chrome.next')}
          </button>
        </div>
        <span className="footer-note">{footerNote || t('chrome.footerNote')}</span>
      </footer>
    </div>
  )
}

export default Chrome
