export interface SnapGuide {
  type: 'vertical' | 'horizontal'
  position: number
}

export interface SnapBox {
  left: number
  top: number
  width: number
  height: number
}

const SNAP_THRESHOLD_PX = 6

interface SnapResult {
  dx: number
  dy: number
  guides: SnapGuide[]
}

export function computeSnapAdjustment(
  moving: SnapBox,
  canvasWidth: number,
  canvasHeight: number,
  others: SnapBox[]
): SnapResult {
  const xTargets = [0, canvasWidth / 2, canvasWidth]
  const yTargets = [0, canvasHeight / 2, canvasHeight]
  others.forEach((o) => {
    xTargets.push(o.left, o.left + o.width / 2, o.left + o.width)
    yTargets.push(o.top, o.top + o.height / 2, o.top + o.height)
  })

  const movingXs = [moving.left, moving.left + moving.width / 2, moving.left + moving.width]
  const movingYs = [moving.top, moving.top + moving.height / 2, moving.top + moving.height]

  let dx = 0
  let bestDxDist = SNAP_THRESHOLD_PX
  let guideX: number | null = null
  for (const mx of movingXs) {
    for (const tx of xTargets) {
      const dist = Math.abs(mx - tx)
      if (dist < bestDxDist) {
        bestDxDist = dist
        dx = tx - mx
        guideX = tx
      }
    }
  }

  let dy = 0
  let bestDyDist = SNAP_THRESHOLD_PX
  let guideY: number | null = null
  for (const my of movingYs) {
    for (const ty of yTargets) {
      const dist = Math.abs(my - ty)
      if (dist < bestDyDist) {
        bestDyDist = dist
        dy = ty - my
        guideY = ty
      }
    }
  }

  const guides: SnapGuide[] = []
  if (guideX !== null) guides.push({ type: 'vertical', position: guideX })
  if (guideY !== null) guides.push({ type: 'horizontal', position: guideY })

  return { dx, dy, guides }
}
