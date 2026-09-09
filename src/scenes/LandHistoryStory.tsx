import { useId } from 'react'
import FlowArrow from '../components/FlowArrow'
import LineIcon from '../components/LineIcon'
import './LandHistoryStory.css'

export function LandPlot({ state, growth = 1 }: { state: 'active' | 'idle' | 'recovering'; growth?: number }) {
  const plotId = useId().replace(/:/g, '')
  return <svg viewBox="0 0 240 145" fill="none" aria-hidden="true">
    <defs><clipPath id={plotId}><path d="m35 73 85-42 84 42-84 44Z"/></clipPath></defs>
    <path d="m20 73 100-50 100 50-100 53Z" fill="#063544" stroke="#3896a4"/>
    <path d="m20 73 100 53 100-53v12l-100 52L20 85Z" fill="#052631" stroke="#246574"/>
    <path d="m35 73 85-42 84 42-84 44Z" fill={state==='active'?'#326c56':state==='idle'?'#665c3d':'#275846'} stroke="#82b396"/>
    <g clipPath={'url(#'+plotId+')'}><image href={state==='active'?'/photos/point_4/abandoned_land_point_4_active_use.png':'/photos/point_4/abandoned_land_point_4_2025.png'} x="35" y="31" width="170" height="90" preserveAspectRatio="xMidYMid slice" opacity={state==='active'?.65:.35}/></g>
    <path d="m35 73 85-42 84 42-84 44Z" stroke={state==='active'?'#91efc5':'#70c6b7'} strokeWidth="1.5"/>
    {[0,1,2,3,4].map(i=><path key={i} d={`m${49+i*17} ${66-i*8.4} 69 35`} stroke={state==='active'?'#b7d581':'#929777'} opacity={state==='active'? .9:.3} strokeWidth="2"/>)}
    {state!=='active'&&Array.from({length:state==='idle'?5:8+growth*3},(_,i)=><g key={i} transform={`translate(${65+(i*31)%106} ${55+(i*13)%36})`}><path d="M0 2v-8m0 5-5-4m5 2 5-6" stroke={state==='idle'?'#b1b37a':'#85d899'} strokeWidth="2" strokeLinecap="round"/></g>)}
    {state==='active'&&<g><path d="m51 65 67 34 58-29" stroke="#5eddd1" strokeWidth="3"/><path d="m80 45 14-7 14 7v15l-14 7-14-7Z" fill="#174959" stroke="#a2d9c5"/><path d="m77 44 17-13 17 13-17 9Z" fill="#76a9a1"/></g>}
    <path d="m22 107 30 16m138 0 28-15" stroke="#256a78"/>
  </svg>
}
export default function LandHistoryStory() {
  return <figure className="land-history-story" aria-labelledby="land-story-caption">
    <figcaption id="land-story-caption">Follow one plot through time <span>Illustrative screening scenarios</span></figcaption>
    <div className="land-story-opening">
      <article><span className="land-story-number">01 / PAST USE</span><LandPlot state="active"/><h3>Land is in use</h3><p>Cultivation or other productive activity is visible.</p><span className="land-story-link"><FlowArrow/></span></article>
      <article><span className="land-story-number">02 / CHANGE</span><LandPlot state="idle"/><h3>Activity stops</h3><p>The same plot shows no visible signs of active use.</p><span className="land-story-link"><FlowArrow/></span></article>
      <article className="land-observation"><span className="land-story-number">03 / FOLLOW THROUGH TIME</span><div className="land-observation-art"><LineIcon name="satellite"/><div className="observation-rays"/><LandPlot state="recovering"/></div><h3>Look beyond a single image</h3><p>Track whether active use returns in the following years.</p></article>
    </div>
    <div className="land-story-question"><LineIcon name="clock"/><b>Does active use return?</b><span>Two possible paths for the same plot</span></div>
    <div className="land-story-paths">
      {[false,true].map(returned=><article key={String(returned)} className={`land-story-path ${returned?'land-returned':'land-persistent'}`}>
        <header><LineIcon name={returned?'tractor':'leaf'}/><div><h3>{returned?'Active use returns':'Non-use continues'}</h3><p>{returned?'Example: cultivation resumes in year 3':'No return for at least 5 consecutive years'}</p></div></header>
        <ol className="land-year-strip">{[1,2,3,4,5].map(year=><li key={year} className={returned&&year>=3?'is-active':''}><span>Y{year}</span><LandPlot state={returned&&year>=3?'active':'recovering'} growth={year}/><small>{returned&&year>=3?'In use':'No active use'}</small></li>)}</ol>
        <div className="land-story-result"><span><LineIcon name={returned?'tractor':'pin'}/></span><div><b>{returned?'Not abandoned':'Abandoned candidate'}</b><p>{returned?'Active use returned within 5 years.':'Meets the non-use screening criterion; local verification follows.'}</p></div></div>
      </article>)}
    </div>
  </figure>
}
