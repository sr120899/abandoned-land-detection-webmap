import { useId } from 'react'
import landscape from '../assets/concept-landscape.png'

export type VisualKind = 'sources' | 'preprocess' | 'timeline' | 'grid' | 'spectral' | 'texture' | 'trend' | 'dynamics' | 'filter' | 'gate' | 'forest' | 'types' | 'accuracy' | 'errors' | 'tuning' | 'cycle' | 'binary' | 'probability' | 'yod' | 'duration' | 'validated'

/** Illustrative process diagrams; these are not mapped observations or model results. */
export function MethodVisual({ kind }: { kind: VisualKind }) {
  const id = useId().replace(/:/g, '')
  const tile = (y: number, tone = 0) => <g transform={`translate(35 ${y}) matrix(.75 .32 -.75 .32 75 0)`}>
    <image href={landscape} width="100" height="100" preserveAspectRatio="xMidYMid slice" opacity={tone === 1 ? .35 : .85} />
    {tone > 0 && Array.from({ length: 36 }, (_, i) => <rect key={i} x={(i % 6) * 16 + 2} y={Math.floor(i / 6) * 16 + 2} width="12" height="12" fill={(i * 7 % 11) < 4 ? (tone === 2 ? '#aff340' : '#32c2f6') : '#073e48'} opacity=".75" />)}
    <rect width="100" height="100" fill="none" stroke="#73f5f4" strokeWidth="1.5" />
  </g>
  const chart = (segmented = false) => <g>
    <path d="M28 35v110h170M28 65h165M28 100h165" stroke="#185261" fill="none" />
    <path d="m30 95 10-18 10 16 10-33 10 13 10-20 10 18 10-15 10 54 10 17 10-12 10 8 10-18 10 8 10-19 10 12 10-20" stroke="#38ece5" strokeWidth="2" fill="none" />
    {segmented && <><path d="m30 91 62-23 25 55 73-31" fill="none" stroke="#a7ef49" strokeWidth="3"/><path d="M103 36v110" stroke="#9acbd4" strokeDasharray="4 5"/><circle cx="103" cy="91" r="5" fill="#a7ef49"/></>}
    <text x="28" y="163">2000</text><text x="167" y="163">2025</text>
  </g>
  return <svg className={`method-visual visual-${kind}`} viewBox="0 0 220 190" fill="none" aria-hidden="true">
    <defs>
      <radialGradient id={`${id}-glow`}><stop stopColor="#19dacf" stopOpacity=".2"/><stop offset="1" stopColor="#19dacf" stopOpacity="0"/></radialGradient>
      <pattern id={`${id}-grid`} width="18" height="18" patternUnits="userSpaceOnUse"><path d="M18 0H0v18" stroke="#1e8694" strokeWidth=".5" opacity=".35"/></pattern>
    </defs>
    <ellipse cx="110" cy="124" rx="104" ry="64" fill={`url(#${id}-glow)`}/>
    <path d="M8 180 55 115h110l47 65Z" fill={`url(#${id}-grid)`}/>
    {['sources', 'filter', 'validated'].includes(kind) && <>{tile(105, 2)}{tile(66, 1)}{tile(27)}{kind === 'validated' && <g><circle cx="112" cy="87" r="30" fill="#04313c" stroke="#37f8df" strokeWidth="3"/><path d="m96 87 11 12 21-26" stroke="#55ffe2" strokeWidth="5"/></g>}</>}
    {kind === 'preprocess' && <>
      <path d="M69 91H55a22 22 0 0 1-3-44 32 32 0 0 1 62-9 26 26 0 1 1 29 53h-14" stroke="#6ef4fc" strokeWidth="3"/>
      {[0, 1, 2].map(i => <path key={i} d={`M60 ${132 + i * 13} 110 ${113 + i * 13} 160 ${132 + i * 13} 110 ${152 + i * 13}Z`} fill="#08313e" stroke="#49e7ee" strokeWidth="2"/>)}
      {[0, 1, 2, 3, 4].map(i => <rect key={i} x={88 + i % 2 * 18} y={72 + Math.floor(i / 2) * 16} width="10" height="10" fill="#4be7ef"/>)}
    </>}
    {kind === 'timeline' && <>
      {[0, 1, 2, 3].map(i => <g key={i} transform={`translate(${22 + i * 47} ${53 - i * 3}) skewY(-18)`}><image href={landscape} width="35" height="66" preserveAspectRatio="xMidYMid slice" opacity={.4 + i * .18}/><rect width="35" height="66" stroke="#97e8e8"/></g>)}
      <path d="M22 149h176" stroke="#29eeea" strokeWidth="2"/>{[22, 66, 110, 154, 198].map(x => <circle key={x} cx={x} cy="149" r="4" fill="#67ffef"/>)}<text x="20" y="174">2000</text><text x="170" y="174">2025</text>
    </>}
    {kind === 'grid' && <>{tile(69)}<g transform="translate(35 69) matrix(.75 .32 -.75 .32 75 0)"><rect width="100" height="100" fill={`url(#${id}-grid)`}/><rect x="36" y="36" width="18" height="18" stroke="#b9ffff" strokeWidth="3" fill="#5effeb" fillOpacity=".4"/></g><path d="M108 97v-36l27-23h22" stroke="#57f6ed"/><text x="155" y="34">30 m</text></>}
    {['spectral', 'trend', 'dynamics'].includes(kind) && chart(kind !== 'spectral')}
    {['texture', 'binary', 'types', 'errors'].includes(kind) && <>
      {Array.from({ length: 64 }, (_, i) => <rect key={i} x={45 + i % 8 * 17} y={24 + Math.floor(i / 8) * 17} width="13" height="13" rx="1" fill={(i * 13 % 19) < 8 ? (kind === 'binary' ? '#36e5df' : kind === 'types' && i % 3 === 0 ? '#36bdf8' : kind === 'errors' && i % 5 === 0 ? '#ffb454' : '#a8ee48') : '#0c414b'} opacity={kind === 'texture' ? .3 + (i % 4) * .2 : .95}/>)}
      <path d="M39 19h15m-15 0v15m145-15h-15m15 0v15M39 166h15m-15 0v-15m145 15h-15m15 0v-15" stroke="#48dce4"/>
    </>}
    {kind === 'gate' && <>
      {Array.from({ length: 21 }, (_, i) => <circle key={i} cx={64 + i % 7 * 15} cy={30 + Math.floor(i / 7) * 15} r="2" fill={i % 3 ? '#3beced' : '#a9f14a'}/>)}
      <path d="M54 79h112l-43 51v27l-23 15v-42Z" fill="#0b4851" stroke="#5af3ec" strokeWidth="2"/><ellipse cx="110" cy="79" rx="56" ry="9" stroke="#89fff3"/>
    </>}
    {kind === 'forest' && <>
      {[52, 110, 168].map((x, i) => <g key={x} stroke={i === 1 ? '#8ff3b2' : '#35dfea'}><path d={`M${x} 41v26m-23 25V67h46v25m-46 10v26m46-26v26`} strokeWidth="2"/>{[[x, 34], [x - 23, 97], [x + 23, 97], [x - 23, 135], [x + 23, 135]].map(([cx, cy], j) => <rect key={j} x={cx - 6} y={cy - 6} width="12" height="12" rx="2" fill="#07313d"/>)}</g>)}
      <path d="M52 149v13h116v-13m-58 13v15" stroke="#3be6e1"/>
    </>}
    {kind === 'accuracy' && <>
      <path d="M31 153h162" stroke="#3d7b88"/>{[.48, .65, .83, .92].map((v, i) => <rect key={i} x={43 + i * 36} y={153 - v * 125} width="23" height={v * 125} rx="2" fill={i === 3 ? '#68f5c8' : '#28dce5'} opacity={.4 + i * .2}/>)}<path d="m46 78 38-23 38-20 39-13m-12-1 13 1-3 13" stroke="#95ffee" strokeWidth="2"/>
    </>}
    {kind === 'probability' && <>
      {Array.from({ length: 64 }, (_, i) => <rect key={i} x={45 + i % 8 * 17} y={20 + Math.floor(i / 8) * 17} width="14" height="14" rx="1" fill="#65f5cd" opacity={.1 + ((i * 13) % 19) / 21} />)}
      <text x="43" y="180">0</text><text x="179" y="180">1</text>
      {Array.from({ length: 20 }, (_, i) => <rect key={i} x={59 + i * 5.5} y="171" width="5.5" height="7" fill="#65f5cd" opacity={.1 + i / 22} />)}
    </>}
    {kind === 'tuning' && <>{[57, 97, 137].map((y, i) => <g key={y}><path d={`M38 ${y}h146`} stroke="#2a7282" strokeWidth="3"/><path d={`M38 ${y}h${[47, 107, 75][i]}`} stroke="#39eee3" strokeWidth="3"/><rect x={[77, 137, 105][i]} y={y - 10} width="16" height="20" rx="4" fill="#092d3a" stroke="#6dffdf" strokeWidth="2"/></g>)}</>}
    {kind === 'cycle' && <><path d="M59 80a56 56 0 0 1 99-24l10 16m-1-24 1 24-25-2M165 112a56 56 0 0 1-99 24l-10-16m1 24-1-24 25 2" stroke="#53f3e2" strokeWidth="4"/><path d="m90 96 15 15 28-31" stroke="#98f1ae" strokeWidth="4"/></>}
    {kind === 'yod' && <><rect x="52" y="43" width="116" height="111" rx="8" stroke="#36eeea" strokeWidth="3"/><path d="M52 73h116M80 32v26m60-26v26" stroke="#36eeea" strokeWidth="3"/>{Array.from({length: 12}, (_, i) => <rect key={i} x={72 + i % 4 * 22} y={87 + Math.floor(i / 4) * 21} width="10" height="10" rx="2" fill={i === 6 ? '#aafa4b' : '#33c9d7'}/>)}</>}
    {kind === 'duration' && <><circle cx="110" cy="96" r="59" stroke="#14515e" strokeWidth="6"/><path d="M110 37a59 59 0 1 1-56 40" stroke="#37f2e7" strokeWidth="5"/><path d="M110 53v44l28 20" stroke="#83ffee" strokeWidth="4"/><circle cx="110" cy="96" r="5" fill="#7affea"/></>}
  </svg>
}

export function Contours() {
  return <svg className="method-contours" viewBox="0 0 1200 600" preserveAspectRatio="none" aria-hidden="true">
    {Array.from({length: 26}, (_, i) => <path key={i} d={`M-50 ${100+i*17}C170 ${-160+i*24} 260 ${470-i*5} 490 ${235+i*9}S780 ${20+i*18} 1250 ${160+i*19}`} fill="none" stroke="currentColor" strokeWidth=".8"/>)}
  </svg>
}
