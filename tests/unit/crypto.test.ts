import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, hashPassword, verifyPassword } from '../../electron/utils/crypto'

describe('crypto', () => {
  const key = 'test-key-32-bytes-long-enough!!'

  it('encrypt and decrypt correctly', () => {
    const enc = encrypt('hello world', key)
    expect(decrypt(enc, key)).toBe('hello world')
  })

  it('different ciphertext each time', () => {
    expect(encrypt('same', key)).not.toBe(encrypt('same', key))
  })

  it('password hash and verify', async () => {
    const hash = await hashPassword('Pass123!')
    expect(await verifyPassword('Pass123!', hash)).toBe(true)
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })

  it('wrong key fails to decrypt', () => {
    const enc = encrypt('secret', key)
    expect(() => decrypt(enc, 'wrong-key-00000000000000000')).toThrow()
  })
})
