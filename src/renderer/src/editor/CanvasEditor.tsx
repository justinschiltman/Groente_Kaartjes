import type { RefObject } from 'react'
import type { SnapGuide } from './snapping'

interface CanvasEditorProps {
  canvasElRef: RefObject<HTMLCanvasElement | null>
  canvasSizePx: { width: number; height: number }
  guides: SnapGuide[]
}

function CanvasEditor({ canvasElRef, canvasSizePx, guides }: CanvasEditorProps): React.JSX.Element {
  return (
    <div className="canvas-viewport">
      <div className="canvas-stage" style={{ width: canvasSizePx.width, height: canvasSizePx.height }}>
        <canvas ref={canvasElRef} width={canvasSizePx.width} height={canvasSizePx.height} />
        {guides.map((guide, index) => (
          <div
            key={`${guide.type}-${index}`}
            className={`snap-guide snap-guide-${guide.type}`}
            style={
              guide.type === 'vertical'
                ? { left: guide.position }
                : { top: guide.position }
            }
          />
        ))}
      </div>
    </div>
  )
}

export default CanvasEditor
