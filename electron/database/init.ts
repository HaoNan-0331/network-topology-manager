import { getDatabase } from './connection'

export function createTables() {
  getDatabase().exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS topologies (
      id TEXT PRIMARY KEY,
      name_enc TEXT NOT NULL,
      data_enc TEXT NOT NULL,
      status TEXT DEFAULT 'active' CHECK(status IN ('active','pending','draft')),
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      topology_id TEXT,
      name_enc TEXT NOT NULL,
      vendor_enc TEXT,
      model_enc TEXT,
      version_enc TEXT,
      ip_enc TEXT,
      device_type TEXT DEFAULT 'generic' CHECK(device_type IN ('router','switch','firewall','server','generic')),
      connection_type TEXT CHECK(connection_type IN ('ssh','telnet','web')),
      port_enc TEXT,
      username_enc TEXT,
      password_enc TEXT,
      ssh_key_path_enc TEXT,
      ssh_key_content_enc TEXT,
      web_url_enc TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (topology_id) REFERENCES topologies(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS ai_config (
      id TEXT PRIMARY KEY,
      provider_enc TEXT,
      api_key_enc TEXT,
      base_url_enc TEXT,
      model_name_enc TEXT,
      exec_mode TEXT DEFAULT 'confirm' CHECK(exec_mode IN ('confirm','auto')),
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS command_whitelist (
      id TEXT PRIMARY KEY,
      pattern TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS ai_exec_logs (
      id TEXT PRIMARY KEY,
      device_id TEXT,
      device_name_enc TEXT,
      command TEXT NOT NULL,
      status TEXT CHECK(status IN ('approved','rejected','pending','executed','failed')),
      mode TEXT CHECK(mode IN ('confirm','auto')),
      ai_reason TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS chat_history (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      content_enc TEXT NOT NULL,
      device_id TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    INSERT OR IGNORE INTO command_whitelist (id, pattern) VALUES
      ('w1', 'display'),
      ('w2', 'show'),
      ('w3', 'enable'),
      ('w4', 'system-view'),
      ('w5', 'quit'),
      ('w6', 'ping'),
      ('w7', 'traceroute'),
      ('w8', 'terminal');
  `)
}
