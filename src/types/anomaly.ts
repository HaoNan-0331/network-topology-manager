export type ChangeType = 'mac_changed' | 'new_ip' | 'ip_reused'

export interface IPMACBinding {
  id: number
  ip: string
  mac: string
  firstSeen: string
  lastSeen: string
  isActive: boolean
}

export interface IPMACChange {
  id: number
  ip: string
  oldMac: string | null
  newMac: string | null
  changeType: ChangeType
  detectedAt: string
  acknowledged: boolean
  acknowledgedAt: string | null
  notes: string | null
}

export interface ChangeStats {
  total: number
  unacknowledged: number
  macChanged: number
  newIp: number
  ipReused: number
}

export interface ExcludedIP {
  id: number
  ipOrCidr: string
  description: string | null
  createdAt: string
}

export interface CreateExcludedIPInput {
  ipOrCidr: string
  description?: string
}
