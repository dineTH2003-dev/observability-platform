import api from './api';

export interface ReportExport {
  id: number;
  report_type: string;
  scope: string;
  scope_id: string | null;
  time_range: string;
  file_name: string;
  exported_by: string;
  exported_by_email: string | null;
  created_at: string;
}

/**
 * Fetch all export history records (newest first).
 */
export async function getReportHistory(): Promise<ReportExport[]> {
  const response = await api.get<{ success: boolean; count: number; data: ReportExport[] }>(
    '/reports/history'
  );
  return response.data.data;
}

/**
 * Trigger a download of a historical exported PDF by its record ID.
 * Returns a Blob so the caller can create an object URL.
 */
export async function downloadHistoricalReport(id: number): Promise<Blob> {
  const response = await api.get<Blob>(`/reports/history/${id}/download`, {
    responseType: 'blob',
  });
  // axios wraps the blob in response.data
  return response.data as unknown as Blob;
}
