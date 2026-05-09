import { create } from 'zustand'

interface AuthState {
  isLoggedIn: boolean
  isFirstRun: boolean
  token: string | null
  checkFirstRun: () => Promise<void>
  login: (u: string, p: string, ck: string, ci: string) => Promise<string | null>
  initAdmin: (u: string, p: string) => Promise<string | null>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  isFirstRun: false,
  token: null,

  checkFirstRun: async () => {
    const firstRun = await window.api.auth.isFirstRun()
    set({ isFirstRun: firstRun })
  },

  login: async (username, password, captchaKey, captchaInput) => {
    const result = await window.api.auth.login(username, password, captchaKey, captchaInput)
    if (result.success) {
      set({ isLoggedIn: true, token: result.token! })
      return null
    }
    return result.error || '登录失败'
  },

  initAdmin: async (username, password) => {
    const result = await window.api.auth.initAdmin(username, password)
    if (result.success) {
      set({ isFirstRun: false })
      return null
    }
    return result.error || '初始化失败'
  },

  logout: () => set({ isLoggedIn: false, token: null }),
}))
