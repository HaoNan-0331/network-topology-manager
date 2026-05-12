import { Node, Edge } from 'reactflow'
import { DeviceType, ConnectionType } from './device'

export interface TopologyNodeData {
  deviceId: string
  deviceName: string
  deviceType: DeviceType
  connectionType: ConnectionType
  ipAddress: string
  vendor?: string
  model?: string
}

export type TopologyNode = Node<TopologyNodeData>

export interface TopologyEdgeData {
  sourceInterface: string
  targetInterface: string
}

export type TopologyEdge = Edge<TopologyEdgeData>

export interface Topology {
  id: string
  name: string
  nodes: TopologyNode[]
  edges: TopologyEdge[]
  status: 'active' | 'pending' | 'draft'
  createdAt: string
  updatedAt: string
}
