import ConceptCardArt from './ConceptCardArt'
import LandHistoryStory, { LandPlot } from './LandHistoryStory'
import EvidenceJourney from '../components/EvidenceJourney'
import LineIcon from '../components/LineIcon'
import './ConceptScene.css'
import './ConceptRevised.css'

const OBJECTIVES = [
  { icon: 'pin', name: 'WHERE', desc: 'Where are the candidate areas?', answer: 'Mapped locations for review' },
  { icon: 'calendar', name: 'WHEN', desc: 'When did active use appear to stop?', answer: 'Estimated timing of change' },
  { icon: 'clock', name: 'HOW LONG', desc: 'How long has non-use persisted?', answer: 'Duration supported by time-series evidence' },
  { icon: 'target', name: 'WHAT NEXT', desc: 'How can this evidence support the next decision?', answer: 'Priorities for verification and follow-up' },
]
const AIML_ROLE = [
  { icon: 'chip', name: 'DETECT', desc: 'Scan large areas efficiently.' },
  { icon: 'signal', name: 'LOOK BACK', desc: 'Use satellite time series, not a single date.' },
  { icon: 'chart', name: 'PRIORITIZE', desc: 'Highlight areas for review.' },
  { icon: 'search', name: 'SUPPORT ACTION', desc: 'Provide spatial evidence for follow-up.' },
]
function ConceptScene() {
  return <div className="scene-pad concept-revised">
    <section className="cr-hero" aria-labelledby="cr-title">
      <div className="cr-copy">
        <p className="cr-eyebrow">01 / CONCEPT &amp; OBJECTIVES</p>
        <h1 id="cr-title">From abandoned land<br/>to <span>better decisions</span></h1>
        <p className="cr-intro">Some land is held but left unused, while people and communities are looking for space to work and act. This mismatch raises a question: what is happening on that land, and what might it become?</p>
      </div>
      <aside className="cr-hero-aside" aria-label="Land use context">
        <p className="cr-land-caption">LAND DATA FOR A MORE<br/><strong>SUSTAINABLE THAILAND</strong></p>
      </aside>
      <div className="cr-context">
          <article><div className="cr-context-art context-unused" role="img" aria-label="Illustration of an unused agricultural plot with land ownership documents"/><div><h3>HELD, BUT UNUSED</h3><p>Land is held under title, but shows no active use.</p></div></article>
          <article><div className="cr-context-art context-community" role="img" aria-label="Illustration of community members considering land for future activities"/><div><h3>NEEDS SPACE TO ACT</h3><p>People &amp; communities can act, but lack access to land.</p></div></article>
          <article className="cr-gee"><div className="cr-context-art context-screening" role="img" aria-label="Illustration of satellite screening over layered land data"/><div><h3>SCREENED VIA GOOGLE EARTH ENGINE</h3><p>Satellite time series, processed on Google Earth Engine, flag candidate areas for review.</p></div></article>
      </div>
    </section>
    <section className="cr-value-story" aria-labelledby="cr-value-title">
      <header><span className="cr-story-kicker">THE QUESTION BEHIND THE MAP</span><h2 id="cr-value-title">Unused land. Two possible stories.</h2><p>Inactivity can mean different things on the ground.</p></header>
      <div className="cr-value-paths">
        <article className="cr-economic"><LandPlot state="idle"/><div><span>ECONOMIC PERSPECTIVE</span><h3>Productive value may be lost</h3><p>Land no longer supports the activity it once did, while others are looking for space.</p></div></article>
        <article className="cr-ecological"><LandPlot state="recovering" growth={4}/><div><span>ECOLOGICAL PERSPECTIVE</span><h3>New ecological value may emerge</h3><p>Vegetation and natural recovery may change the value of an inactive plot.</p></div></article>
      </div>
      <p className="cr-value-note">These are possibilities to investigate. Satellite evidence locates change; local review explains its meaning.</p>
    </section>
    <aside className="cr-story-bridge"><span className="cr-icon"><LineIcon name="search"/></span><div><span>BEFORE DECIDING WHAT COMES NEXT</span><h2>Where is it &mdash; and how do we know it is abandoned?</h2><p>Locate the land, then follow its history. A single image cannot establish persistent non-use.</p></div></aside>
    <section className="cr-history" aria-labelledby="cr-history-title">
      <h2 id="cr-history-title">Land use history defines abandonment</h2>
      <LandHistoryStory/>
      <aside className="cr-law"><LineIcon name="shield"/><div><h3>Screening threshold and legal context <a href="https://deka.in.th/laws/ldc/6" target="_blank" rel="noreferrer">Land Code, Section 6 &nearr;</a></h3><p>This project uses &ge;5 years of non-use for screening. Thai land law distinguishes title deeds (&gt;10 years) and certificates of utilization (&gt;5 years). Screening does not determine legal status or replace the required legal process.</p></div></aside>
    </section>
    <EvidenceJourney />
    <div className="cr-statement">Detect first. Understand next. Decide better.</div>
    <section className="cr-panels" aria-label="Objectives and role of artificial intelligence">
      <article className="cr-panel"><h2><LineIcon name="target"/>OBJECTIVES</h2><p className="cr-panel-intro">Four questions turn an initial observation into evidence for the next step.</p><div className="cr-illustrated-cards">{OBJECTIVES.map((o,index)=><article className="cr-illustrated-card" key={o.name}><div className="cr-card-picture"><ConceptCardArt kind={o.icon}/></div><div className="cr-card-copy cr-question-copy"><h3><span>0{index+1}</span>{o.name}</h3><p>{o.desc}</p><small>{o.answer}</small></div></article>)}</div><p className="cr-note"><LineIcon name="clock"/>Each answer feeds one field in the screening output; verification adds the local context.</p></article>
      <article className="cr-panel"><h2><LineIcon name="chip"/>ROLE OF AI/ML</h2><p className="cr-panel-intro cr-teal">Built on open satellite data, processed through Google Earth Engine.</p><div className="cr-illustrated-cards">{AIML_ROLE.map(o=><article className="cr-illustrated-card" key={o.name}><div className="cr-card-picture"><ConceptCardArt kind={o.icon}/></div><div className="cr-card-copy"><h3>{o.name}</h3><p>{o.desc}</p></div></article>)}</div><div className="cr-notes"><p className="cr-note"><LineIcon name="shield"/>AI/ML supports initial screening and prioritization, not final decision-making.</p><p className="cr-note"><LineIcon name="leaf"/>Inactive land may also reflect ecological recovery. Local review helps distinguish these possibilities.</p></div></article>
    </section>
  </div>
}
export default ConceptScene
