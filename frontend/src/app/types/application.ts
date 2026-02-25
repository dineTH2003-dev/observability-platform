export interface Application {
  application_id: number;
  name: string;
  description: string;
  version: string;
  server_id: string;
  application_status: 'ACTIVE' | 'WARNING' | 'STOPPED';
  created_at: string;
  updated_at: string;
}