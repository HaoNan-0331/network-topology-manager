import { useCallback } from 'react'
import { useNodesState, useEdgesState, addEdge, type Connection } from 'reactflow'
import TopologyCanvas from '@/components/topology/TopologyCanvas'
import type { TopologyNodeData, TopologyEdgeData } from '@/types/topology'

export default function TopologyPage() {
  const [nodes, , onNodesChange] = useNodesState<TopologyNodeData>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<TopologyEdgeData>([])

  const handleConnect = useCallback(
    (connection: Connection, sourceInterface: string, targetInterface: string) => {
      const edgeData: TopologyEdgeData = {
        sourceInterface,
        targetInterface,
      }
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: 'edgeWithInterfaces',
            data: edgeData,
          },
          eds
        )
      )
    },
    [setEdges]
  )

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 'calc(100vh - 64px)' }}>
      <TopologyCanvas
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
      />
    </div>
  )
}
