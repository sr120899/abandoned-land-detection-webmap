import { useId } from 'react'

/** Compact, schematic evidence illustrations: each tile has one visual message. */
export default function ConceptCardArt({ kind }: { kind: string }) {
  const uid = useId().replace(/:/g, '')
  const plot = (x: number, y: number, scale = 1) => <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <path d="m0 32 48 26 48-26v8L48 66 0 40Z" fill="#063b49" stroke="#287b90"/>
    <path d="m0 25 48 26 48-26v8L48 59 0 33Z" fill="#0a4552" stroke="#43b9bc"/>
    <g transform="matrix(.48 .25 -.48 .25 48 1)">
      <image href="/photos/point_4/abandoned_land_point_4_active_use.png" width="100" height="100" preserveAspectRatio="xMidYMid slice"/>
      <rect width="100" height="100" fill="#0f5c59" fillOpacity=".16" stroke="#abffe7" strokeWidth="2"/>
      <path d="M0 33h100M0 66h100M33 0v100M66 0v100" stroke="#99ffe0" opacity=".4"/>
      <path d="M34 35h29v28H34Z" fill="#bbff5c" fillOpacity=".45" stroke="#d7ff91" strokeWidth="2"/>
    </g>
    <path d="m0 25 48 26 48-26" stroke="#7bffea" strokeWidth="1.5"/>
  </g>
  const miniChart = <><path d="M23 85h128M23 27v58" stroke="#387889"/><path d="m26 42 17-8 18 12 19-10 17 34 18-4 29 7" stroke="#70f1dc" strokeWidth="2.5"/><path d="M97 25v63" stroke="#b9ed79" strokeDasharray="3 3"/><circle cx="97" cy="70" r="4" fill="#b9ed79"/></>
  return <svg className="concept-card-art" viewBox="4 4 168 112" fill="none" aria-hidden="true">
    <defs>
      <radialGradient id={uid+'-halo'}><stop stopColor="#1eead4" stopOpacity=".28"/><stop offset="1" stopColor="#1eead4" stopOpacity="0"/></radialGradient>
      <linearGradient id={uid+'-beam'} x2="0" y2="1"><stop stopColor="#8ffff1" stopOpacity=".55"/><stop offset="1" stopColor="#20cbd6" stopOpacity=".02"/></linearGradient>
      <pattern id={uid+'-grid'} width="12" height="12" patternUnits="userSpaceOnUse"><path d="M12 0H0v12" stroke="#3fa9b7" strokeWidth=".5" opacity=".23"/></pattern>
    </defs>
    <ellipse cx="88" cy="75" rx="88" ry="45" fill={'url(#'+uid+'-halo)'}/>
    <path d="M4 110 37 63h104l31 47Z" fill={'url(#'+uid+'-grid)'}/>
    <path d="M7 107h23M7 107v-12m162 12h-23m23 0V95" stroke="#286e80"/>
    {kind==='pin'&&<path d="M84 39h6l33 40H53Z" fill={'url(#'+uid+'-beam)'}/>}
    {kind==='chip'&&<path d="M75 16h22l42 67H36Z" fill={'url(#'+uid+'-beam)'}/>}
    {kind==='pin'&&<>{plot(35,47)}<ellipse cx="87" cy="70" rx="19" ry="7" stroke="#43e8d8"/><path d="M87 69S70 49 70 38a17 17 0 0 1 34 0c0 11-17 31-17 31Z" fill="#093b48" stroke="#77ffeb" strokeWidth="2"/><circle cx="87" cy="38" r="5" fill="#92f4ca"/></>}
    {kind==='calendar'&&<>{miniChart}<rect x="114" y="14" width="36" height="32" rx="4" fill="#083642" stroke="#5bd8d5"/><path d="M114 25h36m-25-16v10m14-10v10" stroke="#5bd8d5"/><rect x="131" y="30" width="7" height="7" fill="#b9ed79"/></>}
    {kind==='clock'&&<>{plot(21,17,.8)}{plot(80,37,.8)}<path d="M24 97h128" stroke="#387f8d"/>{[0,1,2,3,4].map(i=><g key={i}><circle cx={26+i*30} cy="97" r="3" fill="#a4e994"/><path d={`M${26+i*30} 105v3`} stroke="#6da4af"/></g>)}<path d="M26 87v-6h120v6" stroke="#68efdc"/><text x="69" y="76" fill="#baf4db" fontSize="11">5 years</text></>}
    {kind==='target'&&<>{plot(14,39,.9)}<path d="M99 65h16m-5-5 5 5-5 5" stroke="#56edda" strokeWidth="2"/><rect x="118" y="24" width="42" height="63" rx="5" fill="#093544" stroke="#65ddd6"/><path d="m126 40 3 3 5-6m-8 20 3 3 5-6m4-13h14m-14 16h14m-26 14h26" stroke="#a1f0cb" strokeWidth="1.5"/></>}
    {kind==='chip'&&<>{plot(34,44)}<path d="M38 60V27h98v33M38 40h98" stroke="#69eddd" strokeDasharray="4 3"/><path d="M38 44h98" stroke="#79ffeb" strokeWidth="2"/><rect x="115" y="70" width="33" height="30" rx="4" fill="#073b48" stroke="#6df4dd"/><path d="M124 78h15v14h-15Zm-5-13v5m12-5v5m12-5v5m-24 30v5m12-5v5m12-5v5" stroke="#6df4dd"/></>}
    {kind==='signal'&&<>{plot(13,21,.65)}{plot(59,35,.65)}{plot(105,49,.65)}<path d="M18 100h141m-5-4 5 4-5 4" stroke="#6ac9cd"/><path d="m22 78 27-9 24 10 24-18 30 16 26-9" stroke="#94f4c6" strokeWidth="2"/></>}
    {kind==='chart'&&<>{[0,1,2].map(i=><g key={i}><rect x="27" y={22+i*28} width="122" height="18" rx="4" fill="#12414b"/><rect x="27" y={22+i*28} width={[96,65,36][i]} height="18" rx="4" fill={['#a9e575','#40caba','#28778a'][i]}/><circle cx="138" cy={31+i*28} r="3" fill={i===0?'#b9f38b':'#45727d'}/></g>)}<path d="m130 16 7-7 7 7" stroke="#b5f186"/></>}
    {kind==='search'&&<><rect x="27" y="18" width="78" height="84" rx="6" fill="#093543" stroke="#54a3b5"/>{plot(34,24,.65)}<path d="M39 78h47m-47 10h30" stroke="#66b6c2"/><circle cx="121" cy="66" r="26" fill="#07353f" stroke="#70f0dd" strokeWidth="2.5"/><path d="m140 86 16 17" stroke="#70f0dd" strokeWidth="5" strokeLinecap="round"/><path d="m109 66 8 8 17-20" stroke="#b9ed79" strokeWidth="2.5"/></>}
  </svg>
}
