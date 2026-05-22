export interface ARPEntry {
  ip: string
  mac: string
  vlan?: string
  interface?: string
  aging?: number
  type?: string
}

export interface ARPCollectionResult {
  deviceId: string
  deviceName: string
  deviceIp: string
  vendor: string
  entries: ARPEntry[]
  collectedAt: string
  error?: string
}

export interface ARPScanProgress {
  total: number
  completed: number
  current?: string
  results: ARPCollectionResult[]
}
