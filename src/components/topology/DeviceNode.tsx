import React from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import type { DeviceType } from '@/types/device'
import type { TopologyNodeData } from '@/types/topology'

function RouterIcon() {
  return (
    <svg width="50" height="50" viewBox="0 0 50 50" fill="none">
      <circle cx="25" cy="25" r="22" stroke="#1890ff" strokeWidth="2" fill="#e6f7ff" />
      <path d="M25 8 L25 18" stroke="#1890ff" strokeWidth="2" />
      <path d="M25 32 L25 42" stroke="#1890ff" strokeWidth="2" />
      <path d="M8 25 L18 25" stroke="#1890ff" strokeWidth="2" />
      <path d="M32 25 L42 25" stroke="#1890ff" strokeWidth="2" />
      <polygon points="25,8 22,14 28,14" fill="#1890ff" />
      <polygon points="25,42 22,36 28,36" fill="#1890ff" />
      <polygon points="8,25 14,22 14,28" fill="#1890ff" />
      <polygon points="42,25 36,22 36,28" fill="#1890ff" />
      <circle cx="25" cy="25" r="6" fill="#1890ff" />
    </svg>
  )
}

function SwitchIcon() {
  return (
    <svg width="50" height="50" viewBox="0 0 50 50" fill="none">
      <rect x="5" y="15" width="40" height="20" rx="3" stroke="#52c41a" strokeWidth="2" fill="#f6ffed" />
      <rect x="10" y="22" width="4" height="6" fill="#52c41a" />
      <rect x="17" y="22" width="4" height="6" fill="#52c41a" />
      <rect x="24" y="22" width="4" height="6" fill="#52c41a" />
      <rect x="31" y="22" width="4" height="6" fill="#52c41a" />
      <rect x="38" y="22" width="4" height="6" fill="#52c41a" />
      <line x1="5" y1="12" x2="5" y2="8" stroke="#52c41a" strokeWidth="2" />
      <line x1="15" y1="12" x2="15" y2="8" stroke="#52c41a" strokeWidth="2" />
      <line x1="35" y1="12" x2="35" y2="8" stroke="#52c41a" strokeWidth="2" />
      <line x1="45" y1="12" x2="45" y2="8" stroke="#52c41a" strokeWidth="2" />
      <line x1="5" y1="38" x2="5" y2="42" stroke="#52c41a" strokeWidth="2" />
      <line x1="15" y1="38" x2="15" y2="42" stroke="#52c41a" strokeWidth="2" />
      <line x1="35" y1="38" x2="35" y2="42" stroke="#52c41a" strokeWidth="2" />
      <line x1="45" y1="38" x2="45" y2="42" stroke="#52c41a" strokeWidth="2" />
    </svg>
  )
}

function FirewallIcon() {
  return (
    <svg width="50" height="50" viewBox="0 0 50 50" fill="none">
      <path
        d="M25 3 L45 14 L45 30 Q45 42 25 48 Q5 42 5 30 L5 14 Z"
        stroke="#fa541c" strokeWidth="2" fill="#fff2e8"
      />
      <line x1="5" y1="18" x2="45" y2="18" stroke="#fa541c" strokeWidth="1.5" />
      <line x1="5" y1="28" x2="45" y2="28" stroke="#fa541c" strokeWidth="1.5" />
      <line x1="16" y1="14" x2="16" y2="30" stroke="#fa541c" strokeWidth="1.5" />
      <line x1="25" y1="3" x2="25" y2="18" stroke="#fa541c" strokeWidth="1.5" />
      <line x1="34" y1="14" x2="34" y2="30" stroke="#fa541c" strokeWidth="1.5" />
      <line x1="10" y1="18" x2="10" y2="28" stroke="#fa541c" strokeWidth="1.5" />
      <line x1="40" y1="18" x2="40" y2="28" stroke="#fa541c" strokeWidth="1.5" />
    </svg>
  )
}

function ServerIcon() {
  return (
    <svg width="50" height="50" viewBox="0 0 50 50" fill="none">
      <rect x="10" y="5" width="30" height="12" rx="2" stroke="#722ed1" strokeWidth="2" fill="#f9f0ff" />
      <rect x="10" y="19" width="30" height="12" rx="2" stroke="#722ed1" strokeWidth="2" fill="#f9f0ff" />
      <rect x="10" y="33" width="30" height="12" rx="2" stroke="#722ed1" strokeWidth="2" fill="#f9f0ff" />
      <circle cx="16" cy="11" r="2" fill="#722ed1" />
      <circle cx="16" cy="25" r="2" fill="#722ed1" />
      <circle cx="16" cy="39" r="2" fill="#722ed1" />
      <line x1="22" y1="11" x2="35" y2="11" stroke="#722ed1" strokeWidth="2" />
      <line x1="22" y1="25" x2="35" y2="25" stroke="#722ed1" strokeWidth="2" />
      <line x1="22" y1="39" x2="35" y2="39" stroke="#722ed1" strokeWidth="2" />
    </svg>
  )
}

function GenericIcon() {
  return (
    <svg width="50" height="50" viewBox="0 0 50 50" fill="none">
      <rect x="8" y="8" width="34" height="34" rx="4" stroke="#8c8c8c" strokeWidth="2" fill="#fafafa" />
      <circle cx="25" cy="22" r="8" stroke="#8c8c8c" strokeWidth="2" fill="none" />
      <line x1="25" y1="30" x2="25" y2="38" stroke="#8c8c8c" strokeWidth="2" />
      <line x1="19" y1="38" x2="31" y2="38" stroke="#8c8c8c" strokeWidth="2" />
    </svg>
  )
}

const iconMap: Record<DeviceType, () => React.JSX.Element> = {
  router: RouterIcon,
  switch: SwitchIcon,
  firewall: FirewallIcon,
  server: ServerIcon,
  generic: GenericIcon,
}

export default function DeviceNode({ data, selected }: NodeProps<TopologyNodeData>) {
  const IconComponent = iconMap[data.deviceType] || GenericIcon

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
      <Handle type="target" position={Position.Bottom} style={{ visibility: 'hidden' }} />
      <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />
      <Handle type="target" position={Position.Right} style={{ visibility: 'hidden' }} />

      <div
        style={{
          position: 'absolute',
          top: -20,
          whiteSpace: 'nowrap',
          fontSize: 12,
          fontWeight: 600,
          color: '#333',
          userSelect: 'none',
        }}
      >
        {data.deviceName}
      </div>

      <div
        style={{
          padding: 4,
          borderRadius: 8,
          border: selected ? '2px solid #1890ff' : '2px solid transparent',
          background: selected ? 'rgba(24,144,255,0.06)' : 'transparent',
        }}
      >
        <IconComponent />
      </div>

      <div
        style={{
          marginTop: 2,
          fontSize: 10,
          color: '#999',
          userSelect: 'none',
        }}
      >
        {data.ipAddress}
      </div>

      <Handle type="source" position={Position.Top} style={{ visibility: 'hidden' }} id="top" />
      <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} id="bottom" />
      <Handle type="source" position={Position.Left} style={{ visibility: 'hidden' }} id="left" />
      <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} id="right" />
    </div>
  )
}
