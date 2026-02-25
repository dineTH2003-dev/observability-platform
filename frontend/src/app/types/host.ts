export interface Host {
  server_id: number;
  hostname: string;
  ip_address: string;
  os: string;
  server_status: string;
  agent_status: string;
  username: string;
  ssh_port: number | null;
  last_discovered_at: string;
  created_at: string;
  updated_at: string;
}