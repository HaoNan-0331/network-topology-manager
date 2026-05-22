import { Client } from 'ssh2'
import { Telnet } from 'telnet-client'
import { getDatabase } from '../database/connection'
import { ARPParser } from './arpParser'
import { encField, decField } from '../utils/crypto'
import { listDevices } from './device'

let MK = ''
export function setArpMasterKey(key: string) { MK = key }

function dec(val: string | null | undefined): string { return decField(val, MK) }

interface ARPEntry { ip: string; mac: string; vlan?: string; interface?: string; aging?: number; type?: string }
interface ARPCollectionResult { deviceId: string; deviceName: string; deviceIp: string; vendor: string; entries: ARPEntry[]; collectedAt: string; error?: string }

function getARPCommand(vendor: string): string {
  switch (vendor.toLowerCase()) {
    case 'huawei': case 'h3c': return 'display arp all'
    case 'cisco': case 'ruijie': return 'show ip arp'
    default: return 'display arp all'
  }
}

async function executeSSH(host: string, port: number, username: string, password: string, command: string, timeout: number = 30000): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = new Client()
    const timeoutId = setTimeout(() => { client.destroy(); reject(new Error(`SSH timeout after ${timeout}ms`)) }, timeout)

    client.on('ready', () => {
      clearTimeout(timeoutId)
      client.exec(command, (err, stream) => {
        if (err) { client.end(); reject(err); return }
        let output = ''
        stream.on('data', (data: Buffer) => { output += data.toString() })
        stream.stderr.on('data', (data: Buffer) => { output += data.toString() })
        stream.on('close', () => { client.end(); resolve(output) })
        stream.on('error', (e: Error) => { client.end(); reject(e) })
      })
    })
    client.on('error', (err) => { clearTimeout(timeoutId); reject(err) })
    client.connect({
      host, port, username, password, readyTimeout: timeout,
      algorithms: {
        kex: ['curve25519-sha256', 'ecdh-sha2-nistp256', 'ecdh-sha2-nistp384', 'ecdh-sha2-nistp521', 'diffie-hellman-group-exchange-sha256', 'diffie-hellman-group14-sha256', 'diffie-hellman-group14-sha1', 'diffie-hellman-group1-sha1'],
        cipher: ['aes128-gcm', 'aes256-gcm', 'aes128-ctr', 'aes192-ctr', 'aes256-ctr', 'aes128-cbc', 'aes256-cbc', '3des-cbc'],
        serverHostKey: ['ssh-ed25519', 'ecdsa-sha2-nistp256', 'rsa-sha2-512', 'rsa-sha2-256', 'ssh-rsa'],
      },
    })
  })
}

async function executeTelnet(host: string, port: number, username: string, password: string, command: string, timeout: number = 30000): Promise<string> {
  const connection = new Telnet()
  await connection.connect({
    host, port, timeout, username, password,
    loginPrompt: /Username:|login:/i,
    passwordPrompt: /Password:/i,
    shellPrompt: /[>#]/,
    echoLines: 0, stripShellPrompt: true, execTimeout: timeout, newlineReplace: true,
  })
  const result = await connection.exec(command)
  await connection.end()
  await connection.destroy()
  return result
}

export class ARPCollector {
  private concurrency: number
  private timeout: number

  constructor(options?: { concurrency?: number; timeout?: number }) {
    this.concurrency = options?.concurrency ?? 3
    this.timeout = options?.timeout ?? 30000
  }

  async collectFromDevice(device: { id: string; name: string; ipAddress: string; vendor: string; connectionType: string; port: number | null; username: string; password: string }): Promise<ARPCollectionResult> {
    const result: ARPCollectionResult = {
      deviceId: device.id, deviceName: device.name, deviceIp: device.ipAddress,
      vendor: device.vendor, entries: [], collectedAt: new Date().toISOString(),
    }
    try {
      const command = getARPCommand(device.vendor)
      let output: string
      if (device.connectionType === 'ssh') {
        output = await executeSSH(device.ipAddress, device.port || 22, device.username, device.password, command, this.timeout)
      } else {
        output = await executeTelnet(device.ipAddress, device.port || 23, device.username, device.password, command, this.timeout)
      }
      result.entries = ARPParser.parse(output, device.vendor)
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error)
    }
    return result
  }

  async collectFromDevices(
    devices: any[],
    onProgress?: (progress: { total: number; completed: number; current?: string }) => void
  ): Promise<ARPCollectionResult[]> {
    const progress = { total: devices.length, completed: 0 }
    const results: ARPCollectionResult[] = []
    for (let i = 0; i < devices.length; i += this.concurrency) {
      const batch = devices.slice(i, i + this.concurrency)
      const batchResults = await Promise.all(batch.map(async (device) => {
        progress.current = device.name; onProgress?.(progress)
        const result = await this.collectFromDevice(device)
        progress.completed++; onProgress?.(progress)
        return result
      }))
      results.push(...batchResults)
    }
    return results
  }

  static async collectFromAll(): Promise<ARPCollectionResult[]> {
    const devices = listDevices()
    if (devices.length === 0) return []
    const collector = new ARPCollector()
    return collector.collectFromDevices(devices)
  }
}
