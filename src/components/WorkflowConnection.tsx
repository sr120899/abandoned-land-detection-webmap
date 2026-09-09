import { useLayoutEffect, useRef } from 'react'

/** Connect the selected logic marker to its detail header using actual layout positions. */
export default function WorkflowConnection({ stage }: { stage: number | null }) {
  const ref = useRef<SVGSVGElement>(null)
  useLayoutEffect(() => {
    const svg = ref.current
    const root = svg?.parentElement
    if (!svg || !root || stage === null) return
    const marker = root.querySelector('.method-flow-rail > .active')
    const target = root.querySelector(`#method-detail-${stage} .workflow-detail-main > header > .stage-number`)
    const path = svg.querySelector('path')
    if (!marker || !target || !path) return
    const update = () => {
      const box = root.getBoundingClientRect(), from = marker.getBoundingClientRect(), to = target.getBoundingClientRect()
      if (!from.width || !to.width) { path.setAttribute('d', ''); return }
      const x1 = from.right - box.left, y1 = from.top + from.height / 2 - box.top
      const x2 = to.left - box.left - 6, y2 = to.top + to.height / 2 - box.top
      const bend = x1 + Math.max(6, (x2 - x1) * .45)
      path.setAttribute('d', `M${x1} ${y1}H${bend}V${y2}H${x2}m-5-4 5 4-5 4`)
    }
    const observer = new ResizeObserver(update)
    for (const element of [root, marker, target, target.parentElement!]) observer.observe(element)
    update()
    return () => observer.disconnect()
  }, [stage])
  return <svg ref={ref} className="workflow-live-connection" style={stage === null ? { display: 'none' } : undefined} aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/></svg>
}
