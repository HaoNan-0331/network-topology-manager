import { getBezierPath, EdgeLabelRenderer, type EdgeProps } from 'reactflow'
import type { TopologyEdgeData } from '@/types/topology'

export default function EdgeWithInterfaces({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
}: EdgeProps<TopologyEdgeData>) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  const sourceLabel = data?.sourceInterface || ''
  const targetLabel = data?.targetInterface || ''

  return (
    <>
      <path
        id={id}
        d={edgePath}
        style={style}
        className="react-flow__edge-path"
        stroke="#b1b1b7"
        strokeWidth={1.5}
        fill="none"
      />
      {sourceLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${sourceX}px, ${sourceY - 16}px)`,
              fontSize: 10,
              color: '#666',
              background: '#fff',
              padding: '1px 4px',
              borderRadius: 3,
              border: '1px solid #e8e8e8',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {sourceLabel}
          </div>
        </EdgeLabelRenderer>
      )}
      {targetLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${targetX}px, ${targetY + 16}px)`,
              fontSize: 10,
              color: '#666',
              background: '#fff',
              padding: '1px 4px',
              borderRadius: 3,
              border: '1px solid #e8e8e8',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {targetLabel}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
