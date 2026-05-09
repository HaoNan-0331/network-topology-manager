import { useCallback, useEffect, useRef, useState } from 'react'
import { useNodesState, useEdgesState, addEdge, type Connection } from 'reactflow'
import { Button, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import TopologyCanvas from '@/components/topology/TopologyCanvas'
import TopologyToolbar from '@/components/topology/TopologyToolbar'
import AddDeviceModal from '@/components/topology/AddDeviceModal'
import type { TopologyNode, TopologyNodeData, TopologyEdgeData } from '@/types/topology'
import type { ConnectionType } from '@/types/device'

export default function TopologyPage() {
  const [topologies, setTopologies] = useState<any[]>([])
  const [currentTopologyId, setCurrentTopologyId] = useState<string | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState<TopologyNodeData>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<TopologyEdgeData>([])
  const [addDeviceOpen, setAddDeviceOpen] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLoadingRef = useRef(false)

  const fetchTopologies = useCallback(async () => {
    const list = await window.api.topology.list()
    setTopologies(list)
  }, [])

  useEffect(() => {
    fetchTopologies()
  }, [fetchTopologies])

  const loadTopology = useCallback(async (id: string) => {
    isLoadingRef.current = true
    const topo = await window.api.topology.getById(id)
    if (topo) {
      setNodes(topo.nodes || [])
      setEdges(topo.edges || [])
    }
    isLoadingRef.current = false
  }, [setNodes, setEdges])

  const handleTopologyChange = useCallback((id: string | null) => {
    setCurrentTopologyId(id)
    if (id) {
      loadTopology(id)
    } else {
      setNodes([])
      setEdges([])
    }
  }, [loadTopology, setNodes, setEdges])

  const saveTopology = useCallback(async () => {
    if (!currentTopologyId) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    await window.api.topology.update(currentTopologyId, {
      nodes: nodes.map((n) => ({ ...n })),
      edges: edges.map((e) => ({ ...e })),
    })
    message.success('保存成功')
  }, [currentTopologyId, nodes, edges])

  const debouncedSave = useCallback(() => {
    if (!currentTopologyId) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      window.api.topology.update(currentTopologyId, {
        nodes: nodes.map((n) => ({ ...n })),
        edges: edges.map((e) => ({ ...e })),
      })
    }, 1000)
  }, [currentTopologyId, nodes, edges])

  useEffect(() => {
    if (isLoadingRef.current) return
    if (currentTopologyId && (nodes.length > 0 || edges.length > 0)) {
      debouncedSave()
    }
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [nodes, edges, currentTopologyId, debouncedSave])

  const handleNew = useCallback(async (name: string) => {
    const topo = await window.api.topology.create({ name, nodes: [], edges: [] })
    await fetchTopologies()
    setCurrentTopologyId(topo.id)
    setNodes([])
    setEdges([])
    message.success('创建成功')
  }, [fetchTopologies, setNodes, setEdges])

  const handleDelete = useCallback(async () => {
    if (!currentTopologyId) return
    await window.api.topology.delete(currentTopologyId)
    setCurrentTopologyId(null)
    setNodes([])
    setEdges([])
    await fetchTopologies()
    message.success('删除成功')
  }, [currentTopologyId, fetchTopologies, setNodes, setEdges])

  const handleImport = useCallback(async (jsonStr: string) => {
    try {
      const topo = await window.api.topology.importJson(jsonStr)
      await fetchTopologies()
      setCurrentTopologyId(topo.id)
      if (topo.nodes) setNodes(topo.nodes)
      if (topo.edges) setEdges(topo.edges)
      message.success('导入成功')
    } catch {
      message.error('导入失败')
    }
  }, [fetchTopologies, setNodes, setEdges])

  const handleExport = useCallback(async () => {
    if (!currentTopologyId) return
    try {
      const jsonStr = await window.api.topology.exportJson(currentTopologyId)
      const topo = topologies.find((t) => t.id === currentTopologyId)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${topo?.name || 'topology'}.json`
      a.click()
      URL.revokeObjectURL(url)
      message.success('导出成功')
    } catch {
      message.error('导出失败')
    }
  }, [currentTopologyId, topologies])

  const handleConnect = useCallback(
    (connection: Connection, sourceInterface: string, targetInterface: string) => {
      const edgeData: TopologyEdgeData = { sourceInterface, targetInterface }
      setEdges((eds) =>
        addEdge({ ...connection, type: 'edgeWithInterfaces', data: edgeData }, eds)
      )
    },
    [setEdges]
  )

  const handleAddDevices = useCallback((newNodes: TopologyNode[]) => {
    setNodes((nds) => [...nds, ...newNodes])
    setAddDeviceOpen(false)
  }, [setNodes])

  const handleNodeDoubleClick = useCallback(async (_nodeId: string, data: TopologyNodeData) => {
    try {
      const connType: ConnectionType = data.connectionType || 'ssh'
      if (connType === 'web') {
        const device = await window.api.device.getById(data.deviceId)
        if (device?.webUrl) {
          await window.api.connection.openWeb(device.webUrl)
        } else {
          message.warning('该设备未配置 Web 地址')
        }
      } else if (connType === 'telnet') {
        await window.api.connection.telnetConnect(data.deviceId)
      } else {
        await window.api.connection.sshConnect(data.deviceId)
      }
    } catch {
      message.error('连接失败')
    }
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <TopologyToolbar
        topologies={topologies}
        currentTopologyId={currentTopologyId}
        onTopologyChange={handleTopologyChange}
        onNew={handleNew}
        onSave={saveTopology}
        onDelete={handleDelete}
        onImport={handleImport}
        onExport={handleExport}
      />
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <TopologyCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onNodeDoubleClick={handleNodeDoubleClick}
        />
        {currentTopologyId && (
          <Button
            type="primary"
            shape="circle"
            icon={<PlusOutlined />}
            size="large"
            style={{ position: 'absolute', bottom: 24, right: 24, zIndex: 10 }}
            onClick={() => setAddDeviceOpen(true)}
          />
        )}
      </div>
      <AddDeviceModal
        open={addDeviceOpen}
        existingNodes={nodes}
        onConfirm={handleAddDevices}
        onCancel={() => setAddDeviceOpen(false)}
      />
    </div>
  )
}
