import type { RefObject } from 'react'
import type { SnapGuide } from './snapping'

interface CanvasEditorProps {
  canvasElRef: RefObject<HTMLCanvasElement | null>
  canvasSizePx: { width: number; height: number }
  snapGuides: SnapGuide[]
  zoom: number
  onWheel?: (event: React.WheelEvent) => void
}

function CanvasEditor({ canvasElRef, canvasSizePx, snapGuides, zoom, onWheel }: CanvasEditorProps): React.JSX.Element {
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
          {/* No width/height here — Fabric owns this element's sizing (see useFabricCanvas.ts). */}
          <canvas ref={canvasElRef} />
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
