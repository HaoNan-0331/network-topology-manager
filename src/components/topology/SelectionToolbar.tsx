import { useMemo } from 'react'
import { Button, Space } from 'antd'
import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { useStore } from 'reactflow'
import type { TopologyNode, TopologyEdge } from '@/types/topology'

interface SelectionToolbarProps {
  selectedNodes: TopologyNode[]
  selectedEdges: TopologyEdge[]
  allNodes: TopologyNode[]
  onDelete: () => void
  onEdit: () => void
}

export default function SelectionToolbar({
  selectedNodes,
  selectedEdges,
  allNodes,
  onDelete,
  onEdit,
}: SelectionToolbarProps) {
  const transform = useStore((s) => s.transform)

  const position = useMemo(() => {
    const hasSelection = selectedNodes.length > 0 || selectedEdges.length > 0
    if (!hasSelection) return null

    let x = 0
    let y = 0
    let count = 0

    // Collect positions from selected nodes
    for (const node of selectedNodes) {
      x += node.position.x
      y += node.position.y
      count++
    }

    // Collect positions from nodes connected by selected edges
    const nodeMap = new Map(allNodes.map((n) => [n.id, n]))
    for (const edge of selectedEdges) {
      const src = nodeMap.get(edge.source)
      const tgt = nodeMap.get(edge.target)
      if (src) { x += src.position.x; y += src.position.y; count++ }
      if (tgt) { x += tgt.position.x; y += tgt.position.y; count++ }
    }

    if (count === 0) return null

    const avgX = x / count
    const avgY = y / count - 60

    const screenX = avgX * transform[2] + transform[0]
    const screenY = avgY * transform[2] + transform[1]

    return { x: screenX, y: screenY }
  }, [selectedNodes, selectedEdges, allNodes, transform])

  if (!position) return null

  const isNodeSelected = selectedNodes.length > 0

  return (
    <Space
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -100%)',
        zIndex: 10,
        background: '#fff',
        padding: '4px 8px',
        borderRadius: 6,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      {isNodeSelected && (
        <Button size="small" icon={<EditOutlined />} onClick={onEdit}>
          编辑属性
        </Button>
      )}
      <Button size="small" danger icon={<DeleteOutlined />} onClick={onDelete}>
        删除
      </Button>
    </Space>
  )
}
