export interface NetworkSegment {
  id: number
  name: string
  network: string
  mask: string
  cidr: number
  gateway?: string
  description?: string
  isAutoDiscovered: boolean
  createdAt: string
  updatedAt: string
}

export interface IPUsage {
  networkId: number
  total: number
  used: number
  available: number
  usagePercent: number
}

export interface IPDetail {
  ip: string
  mac?: string
  macVendor?: string
  status: 'used' | 'deprecated'
  lastSeen?: string
  hostname?: string
  interface?: string
  deviceName?: string
}

export interface CreateNetworkInput {
  name: string
  network: string
  mask: string
  gateway?: string
  description?: string
}

export interface UpdateNetworkInput {
  id: number
  name?: string
  network?: string
  mask?: string
  gateway?: string
  description?: string
}
