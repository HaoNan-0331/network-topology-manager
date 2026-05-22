export interface OUIEntry {
  id: number
  ouiPrefix: string
  vendorName: string
  isCustom: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateOUIInput {
  ouiPrefix: string
  vendorName: string
}

export interface UpdateOUIInput {
  id: number
  ouiPrefix?: string
  vendorName?: string
}

export interface OUIStats {
  total: number
  custom: number
  vendors: number
}

export interface ScheduleConfig {
  id: number
  enabled: boolean
  intervalMinutes: number
  lastRun: string | null
  nextRun: string | null
}

export interface SchedulerStatus {
  isRunning: boolean
  isTaskRunning: boolean
  config: ScheduleConfig
}

export interface UpdateScheduleInput {
  enabled?: boolean
  intervalMinutes?: number
}
