/**
 * Command whitelist safety checker.
 * Whitelist: command must start with one of the allowed prefixes.
 * Blacklist: always blocked patterns (even if prefix matches whitelist).
 */

export function isCommandAllowed(
  command: string,
  whitelist: string[]
): { allowed: boolean; reason: string } {
  const cmd = command.trim().toLowerCase()

  // Blacklist — always rejected even if prefix matches whitelist
  const BLOCKED = [
    /\bshutdown\b/i,
    /\bconfigure\s+terminal\b/i,
    /\bconfig\s+t\b/i,
    /\bdelete\b/i,
    /\berase\b/i,
    /\breset\b/i,
    /\breboot\b/i,
    /\breload\b/i,
    /\bwrite\b/i,
    /\bsave\b/i,
    /\bcommit\b/i,
    /\bundo\b/i,
  ]

  for (const pattern of BLOCKED) {
    if (pattern.test(cmd)) {
      return { allowed: false, reason: `禁止的命令模式: ${pattern.source}` }
    }
  }

  // Whitelist — command must start with an allowed prefix
  for (const prefix of whitelist) {
    if (cmd.startsWith(prefix.toLowerCase())) {
      return { allowed: true, reason: `匹配白名单: ${prefix}` }
    }
  }

  return { allowed: false, reason: '不在命令白名单中' }
}
