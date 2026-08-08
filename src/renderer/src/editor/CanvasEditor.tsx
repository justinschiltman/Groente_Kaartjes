import type { RefObject } from 'react'
import type { LayoutGuides } from '@shared/types/template'
import type { SnapGuide } from './snapping'

interface CanvasEditorProps {
  canvasElRef: RefObject<HTMLCanvasElement | null>
  canvasSizePx: { width: number; height: number }
  snapGuides: SnapGuide[]
  layoutGuides?: LayoutGuides
  zoom: number
  onWheel?: (event: React.WheelEvent) => void
}

function layoutGuidePositions(guides: LayoutGuides, sizePx: number): number[] {
  const positions: number[] = []
  for (let i = 1; i < guides.count; i++) {
    positions.push((sizePx * i) / guides.count)
  }
  return positions
}

function CanvasEditor({ canvasElRef, canvasSizePx, snapGuides, layoutGuides, zoom, onWheel }: CanvasEditorProps): React.JSX.Element {
  const layoutGuidePx = layoutGuides
    ? layoutGuidePositions(layoutGuides, layoutGuides.orientation === 'horizontal' ? canvasSizePx.height : canvasSizePx.width)
    : []

  return (
    <div className="canvas-viewport" onWheel={onWheel}>
      <div
        className="canvas-zoom-wrapper"
        style={{ width: canvasSizePx.width * zoom, height: canvasSizePx.height * zoom }}
      >
        <div
          className="canvas-stage"
          style={{
            width: canvasSizePx.width,
            height: canvasSizePx.height,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left'
          }}
        >
          <canvas ref={canvasElRef} width={canvasSizePx.width} height={canvasSizePx.height} />
          {layoutGuidePx.map((position, index) => (
            <div
              key={`layout-${index}`}
              className={`layout-guide layout-guide-${layoutGuides?.orientation}`}
              style={layoutGuides?.orientation === 'horizontal' ? { top: position } : { left: position }}
            />
          ))}
          {snapGuides.map((guide, index) => (
            <div
              key={`snap-${guide.type}-${index}`}
              className={`snap-guide snap-guide-${guide.type}`}
              style={guide.type === 'vertical' ? { left: guide.position } : { top: guide.position }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default CanvasEditor
