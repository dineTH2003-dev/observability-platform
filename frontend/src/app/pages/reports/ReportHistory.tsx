import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { History, Download, ArrowLeft, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { getReportHistory, downloadHistoricalReport } from '../../../api/reportApi';
import type { ReportExport } from '../../../api/reportApi';

// Map raw report_type values to the display labels used in the Reports page
const REPORT_TYPE_LABELS: Record<string, string> = {
  infrastructure : 'Infrastructure Health Report',
  performance    : 'Service Performance Report',
  incident       : 'Incident & Anomaly Report',
  reliability    : 'System Reliability Report',
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year   : 'numeric',
      month  : 'short',
      day    : 'numeric',
      hour   : '2-digit',
      minute : '2-digit',
    });
  } catch {
    return iso;
  }
}

/** Colour coding for scope badges — matches the Reports page style */
function scopeBadgeClass(scope: string): string {
  if (scope === 'Global')  return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
  if (scope === 'Service') return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
  return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
}

interface Props {
  onNavigate: (page: string) => void;
}

export function ReportHistory({ onNavigate }: Props) {
  const [records, setRecords]         = useState<ReportExport[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [downloading, setDownloading] = useState<number | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getReportHistory();
      setRecords(data);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to load export history';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleDownload = async (record: ReportExport) => {
    setDownloading(record.id);
    try {
      const blob = await downloadHistoricalReport(record.id);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const a   = document.createElement('a');
      a.href     = url;
      a.download = record.file_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded successfully');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Download failed';
      // Surface specific messages (file missing, not found) clearly
      toast.error(msg);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Report Export History</h1>
          <p className="text-slate-400 text-sm mt-1">Previously exported PDF reports</p>
        </div>
        <Button
          variant="outline"
          className="border-nebula-navy-lighter text-white hover:bg-nebula-navy-lighter"
          onClick={() => onNavigate('reports')}
        >
          <ArrowLeft className="size-4 mr-2" />
          Back to Reports
        </Button>
      </div>

      {/* ── Loading state ────────────────────────────────────────── */}
      {loading && (
        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-12 flex items-center justify-center">
            <div className="text-slate-400 text-sm">Loading export history...</div>
          </CardContent>
        </Card>
      )}

      {/* ── Error state ──────────────────────────────────────────── */}
      {!loading && error && (
        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-12 flex flex-col items-center justify-center gap-4">
            <p className="text-red-400 text-sm">{error}</p>
            <Button
              variant="outline"
              className="border-nebula-navy-lighter text-white hover:bg-nebula-navy-lighter"
              onClick={fetchHistory}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Empty state ──────────────────────────────────────────── */}
      {!loading && !error && records.length === 0 && (
        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-16 flex flex-col items-center justify-center gap-4 text-center">
            <FileText className="size-12 text-slate-600" />
            <div>
              <p className="text-white font-medium">No exported reports yet</p>
              <p className="text-slate-400 text-sm mt-1">
                Reports you export will appear here.
              </p>
            </div>
            <Button
              className="mt-2 bg-gradient-to-r from-nebula-purple to-nebula-blue text-white"
              onClick={() => onNavigate('reports')}
            >
              Go to Reports
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── History table ────────────────────────────────────────── */}
      {!loading && !error && records.length > 0 && (
        <Card className="bg-nebula-navy-light border-nebula-navy-lighter overflow-hidden">
          <CardContent className="p-0">

            {/* ── Card header: summary row ── */}
            <div className="flex items-center gap-2 px-6 py-4 border-b border-nebula-navy-lighter">
              <History className="size-5 text-nebula-cyan" />
              <h2 className="text-lg font-semibold text-white">
                {records.length} Exported Report{records.length !== 1 ? 's' : ''}
              </h2>
            </div>

            {/* ── Responsive table wrapper ── */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse">

                {/* Table head */}
                <thead>
                  <tr className="border-b border-nebula-navy-lighter bg-nebula-navy-dark/40">
                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3 w-[28%]">
                      Report
                    </th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3 w-[12%]">
                      Scope
                    </th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3 w-[18%]">
                      Time Range
                    </th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3 w-[18%]">
                      Exported By
                    </th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3 w-[16%]">
                      Exported At
                    </th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3 w-[8%]">
                      Actions
                    </th>
                  </tr>
                </thead>

                {/* Table body */}
                <tbody className="divide-y divide-nebula-navy-lighter">
                  {records.map((record) => (
                    <tr
                      key={record.id}
                      className="hover:bg-nebula-navy-dark/40 transition-colors"
                    >
                      {/* Report name + filename */}
                      <td className="px-6 py-4 align-top">
                        <p className="text-white text-sm font-medium leading-snug">
                          {REPORT_TYPE_LABELS[record.report_type] ?? record.report_type}
                        </p>
                        <p
                          className="text-slate-500 text-xs mt-0.5 max-w-[240px] truncate"
                          title={record.file_name}
                        >
                          {record.file_name}
                        </p>
                      </td>

                      {/* Scope badge */}
                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${scopeBadgeClass(record.scope)}`}
                        >
                          {record.scope}
                        </span>
                        {record.scope_id && (
                          <p className="text-slate-500 text-xs mt-1 truncate max-w-[90px]" title={record.scope_id}>
                            ID: {record.scope_id}
                          </p>
                        )}
                      </td>

                      {/* Time range */}
                      <td className="px-4 py-4 align-top">
                        <span className="text-slate-300 text-sm">{record.time_range}</span>
                      </td>

                      {/* Exported by */}
                      <td className="px-4 py-4 align-top">
                        <span
                          className="text-slate-300 text-sm block max-w-[160px] truncate"
                          title={record.exported_by_email ?? record.exported_by}
                        >
                          {record.exported_by_email ?? record.exported_by}
                        </span>
                      </td>

                      {/* Exported at */}
                      <td className="px-4 py-4 align-top whitespace-nowrap">
                        <span className="text-slate-300 text-sm">{formatDate(record.created_at)}</span>
                      </td>

                      {/* Download action */}
                      <td className="px-6 py-4 align-top">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-nebula-navy-lighter text-white hover:bg-nebula-navy-lighter whitespace-nowrap"
                          onClick={() => handleDownload(record)}
                          disabled={downloading === record.id}
                        >
                          <Download className="size-3.5 mr-1.5" />
                          {downloading === record.id ? 'Downloading…' : 'Download'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
