import { describe, it, expect, beforeEach } from 'vitest'
import { generateCaptcha, verifyCaptcha } from '../../electron/services/auth'

describe('captcha', () => {
  let captcha: ReturnType<typeof generateCaptcha>

  beforeEach(() => { captcha = generateCaptcha() })

  it('generates svg and key', () => {
    expect(captcha.svg).toContain('<svg')
    expect(captcha.key).toBeTruthy()
    expect(captcha.text).toHaveLength(4)
  })

  it('accepts correct captcha', () => {
    expect(verifyCaptcha(captcha.key, captcha.text)).toBe(true)
  })

  it('rejects wrong captcha', () => {
    expect(verifyCaptcha(captcha.key, 'XXXX')).toBe(false)
  })

  it('case insensitive', () => {
    expect(verifyCaptcha(captcha.key, captcha.text.toLowerCase())).toBe(true)
  })
})
