import { useCallback, useRef, useState } from 'react'
import ReactFlow, {
  Controls,
  MiniMap,
  Background,
  type Connection,
  type Edge,
  type Node,
  type OnNodesChange,
  type OnEdgesChange,
  BackgroundVariant,
} from 'reactflow'
import DeviceNode from './DeviceNode'
import EdgeWithInterfaces from './EdgeWithInterfaces'
import ConnectionModal from './ConnectionModal'

const nodeTypes = { deviceNode: DeviceNode }
const edgeTypes = { edgeWithInterfaces: EdgeWithInterfaces }

interface TopologyCanvasProps {
  nodes: Node[]
  edges: Edge[]
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect?: (connection: Connection, sourceInterface: string, targetInterface: string) => void
}

export default function TopologyCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
}: TopologyCanvasProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const pendingConnection = useRef<Connection | null>(null)

  const handleConnect = useCallback((connection: Connection) => {
    pendingConnection.current = connection
    setModalOpen(true)
  }, [])

  const handleModalConfirm = useCallback(
    (sourceInterface: string, targetInterface: string) => {
      if (pendingConnection.current && onConnect) {
        onConnect(pendingConnection.current, sourceInterface, targetInterface)
      }
      pendingConnection.current = null
      setModalOpen(false)
    },
    [onConnect]
  )

  const handleModalCancel = useCallback(() => {
    pendingConnection.current = null
    setModalOpen(false)
  }, [])

  const sourceDeviceName = nodes.find((n) => n.id === pendingConnection.current?.source)?.data?.deviceName
  const targetDeviceName = nodes.find((n) => n.id === pendingConnection.current?.target)?.data?.deviceName

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        defaultEdgeOptions={{
          type: 'edgeWithInterfaces',
        }}
      >
        <Controls />
        <MiniMap
          nodeStrokeColor="#888"
          nodeColor="#e6f7ff"
          nodeBorderRadius={8}
        />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      </ReactFlow>
      <ConnectionModal
        open={modalOpen}
        sourceDeviceName={sourceDeviceName}
        targetDeviceName={targetDeviceName}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
      />
    </div>
  )
}
