import crypto from 'crypto'
import { getDatabase } from '../database/connection'
import { hashPassword, verifyPasswordSync } from '../utils/crypto'

const captchaStore = new Map<string, { text: string; expires: number }>()

export function generateCaptcha() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let text = ''
  for (let i = 0; i < 4; i++) text += chars[Math.floor(Math.random() * chars.length)]
  const key = crypto.randomUUID()
  captchaStore.set(key, { text, expires: Date.now() + 5 * 60 * 1000 })
  return { svg: renderSvg(text), key, text }
}

export function verifyCaptcha(key: string, input: string): boolean {
  const s = captchaStore.get(key)
  if (!s) return false
  if (Date.now() > s.expires) { captchaStore.delete(key); return false }
  captchaStore.delete(key)
  return s.text.toUpperCase() === input.toUpperCase()
}

export function login(username: string, password: string, captchaKey: string, captchaInput: string) {
  if (!verifyCaptcha(captchaKey, captchaInput)) return { success: false, error: '验证码错误' }
  const db = getDatabase()
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any
  if (!user) return { success: false, error: '用户名或密码错误' }
  if (!verifyPasswordSync(password, user.password_hash)) return { success: false, error: '用户名或密码错误' }
  return { success: true, token: crypto.randomUUID() }
}

export function isFirstRun(): boolean {
  return (getDatabase().prepare('SELECT COUNT(*) as c FROM users').get() as any).c === 0
}

export async function initAdmin(username: string, password: string) {
  const db = getDatabase()
  try {
    db.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)').run(crypto.randomUUID(), username, await hashPassword(password))
    return { success: true }
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) return { success: false, error: '用户名已存在' }
    return { success: false, error: '创建失败' }
  }
}

function renderSvg(text: string): string {
  let chars = '', noise = ''
  for (let i = 0; i < text.length; i++) {
    const x = 15 + i * 25, y = 28 + Math.random() * 6 - 3
    chars += `<text x="${x}" y="${y}" font-size="28" fill="rgb(${~~(Math.random()*100)},${~~(Math.random()*100)},${~~(Math.random()*100)})" transform="rotate(${Math.random()*30-15},${x},${y})" font-family="monospace">${text[i]}</text>`
  }
  for (let i = 0; i < 4; i++) noise += `<line x1="${Math.random()*120}" y1="${Math.random()*40}" x2="${Math.random()*120}" y2="${Math.random()*40}" stroke="#aaa" stroke-width="1"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><rect width="100%" height="100%" fill="#f0f0f0"/>${noise}${chars}</svg>`
}
