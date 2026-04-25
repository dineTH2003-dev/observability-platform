import { useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { FileText, Download } from 'lucide-react';

type ReportType = 'system-health' | 'incident-anomaly' | 'mttr-mttd' | 'service-health' | null;

export function Reports() {
  const [reportType, setReportType] = useState<ReportType>(null);
  const [scope, setScope] = useState('global');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reportGenerated, setReportGenerated] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isGenerateDisabled = !fromDate || !toDate || fromDate > toDate || !reportType;

  const handleGenerateReport = async () => {
    setError('');
    if (isGenerateDisabled) return;

    setLoading(true);
    setReportGenerated(false);

    try {
      const response = await fetch(
        "http://localhost:9000/api/reports/preview",
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportType, scope, fromDate, toDate }),
        }
      );

      if (!response.ok) {
        const msg = await response.text();
        throw new Error(msg || 'Failed to fetch report');
      }

      const data = await response.json();
      if (data.rows && data.rows.length === 0) {
        setError('No records found for selected range');
        setReportData(null);
      } else {
        setReportData(data.rows);
      }

      setReportGenerated(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Something went wrong');
      setReportData(null);
      setReportGenerated(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setError('');
    try {
      const response = await fetch(
        "http://localhost:9000/api/reports/export/pdf",
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportType, scope, startDate: fromDate, endDate: toDate }),
        }
      );

      if (!response.ok) {
        const msg = await response.text();
        throw new Error(msg || 'Failed to download PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${reportType}-${fromDate}-to-${toDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'PDF download failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Reports</h1>
        <p className="text-slate-400 text-sm mt-1">Generate time-based summaries and analytics</p>
      </div>

      {/* Report Generator Panel */}
      <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="size-5 text-nebula-cyan" />
            <h2 className="text-lg font-semibold text-white">Report Generator</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Report Type */}
            <div>
              <Label className="text-slate-300 mb-2 block text-sm">Report Type</Label>
              <Select value={reportType || undefined} onValueChange={(value) => setReportType(value as ReportType)}>
                <SelectTrigger className="bg-nebula-navy-dark border-nebula-navy-lighter text-white">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
                  <SelectItem value="system-health">System Health & Uptime</SelectItem>
                  <SelectItem value="incident-anomaly">Incident & Anomaly Summary</SelectItem>
                  <SelectItem value="mttr-mttd">MTTR / MTTD Report</SelectItem>
                  <SelectItem value="service-health">Service Health & Impact</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Scope */}
            <div>
              <Label className="text-slate-300 mb-2 block text-sm">Scope</Label>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger className="bg-nebula-navy-dark border-nebula-navy-lighter text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
                  <SelectItem value="global">Global</SelectItem>
                  <SelectItem value="application">Application</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* From Date */}
            <div>
              <Label className="text-slate-300 mb-2 block text-sm">From Date</Label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-nebula-navy-dark border-nebula-navy-lighter text-white px-3 py-2 rounded"
              />
            </div>

            {/* To Date */}
            <div>
              <Label className="text-slate-300 mb-2 block text-sm">To Date</Label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-nebula-navy-dark border-nebula-navy-lighter text-white px-3 py-2 rounded"
              />
            </div>

            {/* Generate Button */}
            <div className="flex items-end">
              <Button
                onClick={handleGenerateReport}
                disabled={isGenerateDisabled || loading}
                className="w-full bg-gradient-to-r from-nebula-purple to-nebula-blue text-white disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>
          </div>

          {/* Date validation */}
          {fromDate && toDate && fromDate > toDate && (
            <p className="text-red-400 text-sm mt-2">From Date cannot be after To Date</p>
          )}

          {/* Error */}
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </CardContent>
      </Card>

      {/* Parameters line */}
      {reportGenerated && (
        <div className="text-sm text-slate-400 mb-4">
          Parameters: <strong>Type:</strong> {reportType}, <strong>Scope:</strong> {scope}, <strong>From:</strong> {fromDate}, <strong>To:</strong> {toDate}
        </div>
      )}

      {/* Report Output */}
      {reportGenerated && (
        <div className="space-y-6">
          <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
            <CardContent className="p-6 text-white">
              {reportData && reportData.length > 0 ? (
               <div className="overflow-x-auto mt-4">
  <table className="min-w-full border border-nebula-navy-lighter text-sm">
    <thead className="bg-nebula-navy-dark text-slate-300">
      <tr>
        {reportData && Object.keys(reportData[0]).map((key) => (
          <th key={key} className="px-4 py-2 border">
            {key}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {reportData.map((row: any, index: number) => (
        <tr key={index} className="text-white border-t">
          {Object.values(row).map((value: any, i: number) => (
            <td key={i} className="px-4 py-2 border">
              {value}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
</div>
              ) : (
                <p className="text-red-400">No records for the selected range</p>
              )}

              {reportData && reportData.length > 0 && (
                <Button
                  variant="outline"
                  className="mt-4 border-nebula-navy-lighter text-white hover:bg-nebula-navy-lighter"
                  onClick={handleDownloadPDF}
                >
                  <Download className="size-4 mr-2" />
                  Export PDF
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}