export interface ARPEntry {
  ip: string
  mac: string
  vlan?: string
  interface?: string
  aging?: number
  type?: string
}

export class ARPParser {
  static parseH3C(output: string): ARPEntry[] {
    let cleanOutput = output.replace(/true/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const lines = cleanOutput.split('\n')
    const entries: ARPEntry[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line || /IP\s*address/i.test(line) || /Type:/i.test(line) || /^[-=]+$/.test(line)) continue

      const parts = line.split(/\s+/)
      if (parts.length >= 2 && this.isValidIP(parts[0])) {
        const ip = parts[0]
        const mac = parts[1]
        if (this.isValidMAC(mac)) {
          let interfaceName: string | undefined
          let type: string | undefined
          let vlan: string | undefined
          let aging: number | undefined

          for (let j = 2; j < parts.length; j++) {
            if (/^\d{1,4}$/.test(parts[j]) && vlan === undefined && parseInt(parts[j]) <= 4094) { vlan = parts[j]; continue }
            if (/^\d+$/.test(parts[j]) && aging === undefined && parseInt(parts[j]) > 4094) { aging = parseInt(parts[j]); continue }
            if (/^[DSI]-?\d*$/i.test(parts[j]) && type === undefined) { type = parts[j]; continue }
            if (/^(GE|XG|Eth|Vlanif|Loop|NULL|BAG|Gig|Ten)/i.test(parts[j])) { interfaceName = parts[j]; continue }
          }

          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1].trim()
            if (/^\d{1,4}$/.test(nextLine) && parseInt(nextLine) <= 4094 && !vlan) { vlan = nextLine; i++ }
          }

          entries.push({ ip, mac: this.normalizeMAC(mac), interface: interfaceName, vlan, aging, type })
        }
      }
    }
    return entries
  }

  static parseHuawei(output: string): ARPEntry[] {
    let cleanOutput = output.replace(/true/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const lines = cleanOutput.split('\n')
    const entries: ARPEntry[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line || /IP\s*ADDRESS/i.test(line) || /VLAN/i.test(line) || /^[-=]+$/.test(line)) continue

      const parts = line.split(/\s+/)
      if (parts.length >= 2 && this.isValidIP(parts[0])) {
        const ip = parts[0]
        const mac = parts[1]
        if (this.isValidMAC(mac)) {
          let interfaceName: string | undefined
          let type: string | undefined
          let aging: number | undefined

          for (let j = 2; j < parts.length; j++) {
            if (/^\d+$/.test(parts[j]) && aging === undefined) { aging = parseInt(parts[j]); continue }
            if (/^[IDS]-?\d*$/i.test(parts[j]) && type === undefined) { type = parts[j]; continue }
            if (/^(GE|XG|Eth|Vlanif|Loop|NULL)/i.test(parts[j])) { interfaceName = parts[j]; break }
          }

          let vlan: string | undefined
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1].trim()
            if (/^\d+$/.test(nextLine) && nextLine.length <= 4) { vlan = nextLine; i++ }
          }

          entries.push({ ip, mac: this.normalizeMAC(mac), interface: interfaceName, vlan, aging, type })
        }
      }
    }
    return entries
  }

  static parseCisco(output: string): ARPEntry[] {
    const lines = output.split('\n')
    const entries: ARPEntry[] = []
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || /Protocol|Address/i.test(trimmed)) continue
      const parts = trimmed.split(/\s+/)
      if (parts.length >= 4 && parts[0] === 'Internet' && this.isValidIP(parts[1])) {
        const mac = parts[3]
        if (this.isValidMAC(mac)) {
          entries.push({
            ip: parts[1], mac: this.normalizeMAC(mac),
            interface: parts[5] || undefined,
            aging: parts[2] !== '-' ? parseInt(parts[2]) || undefined : undefined,
          })
        }
      }
    }
    return entries
  }

  static parseRuijie(output: string): ARPEntry[] {
    return this.parseCisco(output)
  }

  static parse(output: string, vendor: string): ARPEntry[] {
    switch (vendor.toLowerCase()) {
      case 'h3c': return this.parseH3C(output)
      case 'huawei': return this.parseHuawei(output)
      case 'cisco': return this.parseCisco(output)
      case 'ruijie': return this.parseRuijie(output)
      default: return this.parseH3C(output)
    }
  }

  private static isValidIP(ip: string): boolean {
    const parts = ip.split('.')
    if (parts.length !== 4) return false
    return parts.every((part) => { const num = parseInt(part, 10); return !isNaN(num) && num >= 0 && num <= 255 })
  }

  private static isValidMAC(mac: string): boolean {
    const patterns = [
      /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/,
      /^([0-9A-Fa-f]{4}[-]){2}[0-9A-Fa-f]{4}$/,
      /^([0-9A-Fa-f]{4}[.]){2}[0-9A-Fa-f]{4}$/,
      /^[0-9A-Fa-f]{12}$/,
    ]
    return patterns.some((p) => p.test(mac))
  }

  private static normalizeMAC(mac: string): string {
    const clean = mac.replace(/[-.:]/g, '').toLowerCase()
    return clean.match(/.{2}/g)?.join(':') || mac
  }
}
