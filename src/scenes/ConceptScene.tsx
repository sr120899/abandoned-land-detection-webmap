interface Props {
  onNext: () => void
}

function ConceptScene({ onNext }: Props) {
  return (
    <div className="scene-pad">
      <div className="eyebrow-label">CONCEPT</div>
      <h1 className="scene-title">Land use history defines abandonment</h1>

      <div className="flow-row">
        <div className="flow-card">
          <div className="flow-badge">PREVIOUSLY ACTIVE</div>
          <div className="flow-thumb">
            <div className="flow-thumb-icon">🚜</div>
          </div>
          <div className="flow-caption">Land used for agriculture or other productive activities</div>
        </div>

        <div className="flow-arrow">›</div>

        <div className="flow-card">
          <div className="flow-badge">USE STOPS</div>
          <div className="flow-thumb dim">
            <div className="flow-thumb-icon">⏸</div>
          </div>
          <div className="flow-caption">No visible signs of active use detected</div>
        </div>

        <div className="flow-shuffle">🔀</div>

        <div className="flow-branches">
          <div className="branch good">
            <span className="branch-icon">📅✓</span>
            <div>
              <div className="branch-title">NO RETURN FOR<br /><strong>≥5</strong> CONSECUTIVE YEARS</div>
              <div className="branch-timeline">
                <span>Y1</span><span>•</span><span>Y2</span><span>•</span><span>Y3</span><span>•</span><span>Y4</span><span>•</span><span>Y5</span><span className="arrow">→</span>
              </div>
            </div>
          </div>
          <div className="branch warn">
            <span className="branch-icon">🔄</span>
            <div>
              <div className="branch-title">ACTIVE AGAIN<br />WITHIN 5 YEARS</div>
              <div className="branch-timeline">
                <span>Y1</span><span>•</span><span>Y2</span><span>•</span><span>Y3</span><span>•</span><span>RETURN</span><span className="arrow">→</span>
              </div>
            </div>
          </div>
        </div>

        <div className="outcome-cards">
          <div className="outcome-card good">
            <div className="outcome-thumb" />
            <div className="outcome-body">
              <div className="outcome-title">ABANDONED</div>
              <div className="outcome-desc">No return to active use for ≥5 consecutive years</div>
            </div>
            <div className="outcome-icon">🌱</div>
          </div>
          <div className="outcome-card warn">
            <div className="outcome-thumb" />
            <div className="outcome-body">
              <div className="outcome-title">NOT ABANDONED</div>
              <div className="outcome-desc">Returned to active use within 5 years</div>
            </div>
            <div className="outcome-icon">🌱</div>
          </div>
        </div>
      </div>

      <div className="bottom-row">
        <div className="panel">
          <div className="panel-title">OBJECTIVES</div>
          <div className="obj-grid">
            <div className="obj-item">
              <div className="obj-icon">📍</div>
              <div className="obj-name">WHERE</div>
              <div className="obj-desc">Detect where abandonment occurs</div>
            </div>
            <div className="obj-item">
              <div className="obj-icon">📅</div>
              <div className="obj-name">WHEN</div>
              <div className="obj-desc">Identify when use stopped</div>
            </div>
            <div className="obj-item">
              <div className="obj-icon">⏱</div>
              <div className="obj-name">HOW LONG</div>
              <div className="obj-desc">Measure how long the land remains unused</div>
            </div>
            <div className="obj-item">
              <div className="obj-icon">▦</div>
              <div className="obj-name">WHAT TYPE</div>
              <div className="obj-desc">Determine the type of previous land use and abandonment pattern</div>
            </div>
          </div>
        </div>

        <div className="panel-arrow">›</div>

        <div className="cta-block">
          <div className="cta-graphic">⬡</div>
          <button className="cta-link" onClick={onNext}>
            How it works →
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConceptScene
