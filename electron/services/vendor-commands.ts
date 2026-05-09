export type Vendor = 'huawei' | 'cisco' | 'h3c' | 'unknown'

export function detectVendor(versionOutput: string): Vendor {
  const lower = versionOutput.toLowerCase()
  if (lower.includes('huawei') || lower.includes('vrp')) return 'huawei'
  if (lower.includes('cisco') || lower.includes('ios')) return 'cisco'
  if (lower.includes('h3c') || lower.includes('comware')) return 'h3c'
  return 'unknown'
}

export function getDiscoveryCommands(vendor: Vendor): string[] {
  switch (vendor) {
    case 'huawei':
      return [
        'display version',
        'display lldp neighbor brief',
        'display arp',
        'display ip routing-table',
        'display interface brief',
      ]
    case 'cisco':
      return [
        'show version',
        'show lldp neighbors detail',
        'show cdp neighbors detail',
        'show ip arp',
        'show ip route',
        'show ip interface brief',
      ]
    case 'h3c':
      return [
        'display version',
        'display lldp neighbor-information list',
        'display arp',
        'display ip routing-table',
        'display interface brief',
      ]
    default:
      return [
        'show version',
        'display version',
        'show lldp neighbors',
        'display lldp neighbor brief',
      ]
  }
}
