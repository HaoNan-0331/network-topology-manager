import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import crypto from 'crypto'

const KEY_FILE = 'master.key'

export function getOrCreateMasterKey(): string {
  const keyPath = path.join(app.getPath('userData'), KEY_FILE)
  if (fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath, 'utf8')
  }
  const key = crypto.randomBytes(32).toString('base64')
  fs.writeFileSync(keyPath, key, { encoding: 'utf8', mode: 0o600 })
  return key
}
