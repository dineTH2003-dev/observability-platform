import { useState, useEffect } from 'react';
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
import { FileText, Download, History } from 'lucide-react';
import api from '../../../api/api';
import { hostService } from '../../services/hostService';
import { serviceService } from '../../services/serviceService';
import type { Host } from '../../types/host';
import type { Service } from '../../services/serviceService';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  ResponsiveContainer,
} from 'recharts';

type ReportType = 'infrastructure' | 'performance' | 'incident' | 'reliability' | null;

interface ReportsProps {
  onNavigate?: (page: string) => void;
}

export function Reports({ onNavigate }: ReportsProps = {}) {
  const [reportType, setReportType] = useState<ReportType>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reportGenerated, setReportGenerated] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [hosts, setHosts] = useState<Host[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hostsData, servicesData] = await Promise.all([
          hostService.getAll(),
          serviceService.getAll(),
        ]);
        setHosts(hostsData);
        setServices(servicesData);
      } catch (err) {
        console.error('Failed to fetch hosts/services:', err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    setSelectedServerId('');
    setSelectedServiceId('');
  }, [reportType]);

  const calculateSummary = () => {
    if (!reportData) return null;

    if (reportType === 'infrastructure') {
      const records = Array.isArray(reportData) ? reportData : [];
      let cpuValues = records.map((r: any) => Number(r.cpu || 0));
      let memValues = records.map((r: any) => Number(r.memory || 0));
      return {
        totalRecords: records.length,
        avgCpu: (cpuValues.reduce((a, b) => a + b, 0) / (cpuValues.length || 1)).toFixed(2),
        avgMemory: (memValues.reduce((a, b) => a + b, 0) / (memValues.length || 1)).toFixed(2),
      };
    }

    if (reportType === 'performance') {
      const records = Array.isArray(reportData) ? reportData : [];
      let cpuValues = records.map((r: any) => Number(r.cpu || 0));
      let memValues = records.map((r: any) => Number(r.memory || 0));
      return {
        totalRecords: records.length,
        avgResponseTime: "N/A", // Not currently collected
        avgErrorRate: "N/A", // Not currently collected
        avgCpu: (cpuValues.reduce((a, b) => a + b, 0) / (cpuValues.length || 1)).toFixed(2),
        avgMemory: (memValues.reduce((a, b) => a + b, 0) / (memValues.length || 1)).toFixed(2),
      };
    }

    if (reportType === 'incident') {
      const totalAnomalies = reportData.anomalies?.length || 0;
      const totalIncidents = reportData.incidents?.length || 0;
      return { totalAnomalies, totalIncidents };
    }

    if (reportType === 'reliability') {
      return {
        uptime: reportData.uptime_percentage,
        mttd: reportData.mttd_seconds,
        mttr: reportData.mttr_seconds,
        downtime: reportData.critical_downtime_seconds,
      };
    }

    return null;
  };

  const prepareInfraChartData = () => {
    if (!Array.isArray(reportData)) return [];
    return reportData.map((row) => ({
      time: new Date(row.time).toLocaleString(),
      cpu: row.cpu ? parseFloat(row.cpu) : 0,
      memory: row.memory ? parseFloat(row.memory) : 0,
    }));
  };

  const preparePerformanceChartData = () => {
    if (!Array.isArray(reportData)) return [];
    return reportData.map((row) => ({
      time: new Date(row.time).toLocaleString(),
      cpu: row.cpu ? parseFloat(row.cpu) : 0,
      memory: row.memory ? parseFloat(row.memory) : 0,
    }));
  };

  const prepareIncidentChartData = () => {
    if (!reportData || !reportData.incidents) return [];
    const grouped: { [key: string]: number } = {};
    reportData.incidents.forEach((row: any) => {
      const date = new Date(row.time).toLocaleDateString();
      grouped[date] = (grouped[date] || 0) + 1;
    });
    return Object.entries(grouped).map(([time, count]) => ({ time, count }));
  };

  // Local today date in YYYY-MM-DD format
  const today = (() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  const isFutureDateInvalid = Boolean((fromDate && fromDate > today) || (toDate && toDate > today));
  const isDateOrderInvalid = Boolean(fromDate && toDate && fromDate > toDate);
  const isDateInvalid = isFutureDateInvalid || isDateOrderInvalid;

  const isGenerateDisabled =
    !fromDate ||
    !toDate ||
    isDateInvalid ||
    !reportType ||
    (reportType === 'infrastructure' && !selectedServerId);

  const buildReportQuery = () => {
    const params = new URLSearchParams();
    if (reportType) params.append('type', reportType);
    if (fromDate) params.append('from', fromDate);
    if (toDate) params.append('to', toDate);

    let scopeId = null;
    if (reportType === 'infrastructure') {
      scopeId = selectedServerId;
    } else if (reportType === 'performance') {
      scopeId = selectedServiceId && selectedServiceId !== 'global' ? selectedServiceId : null;
    }

    if (scopeId !== null) params.append('scopeId', scopeId);
    return params.toString();
  };

  const handleGenerateReport = async () => {
    setError('');
    if (isGenerateDisabled) return;
    setLoading(true);
    setReportGenerated(false);

    try {
      const query = buildReportQuery();
      // Use shared api axios instance — automatically attaches JWT via interceptor
      const result = await api.get(`/reports?${query}`);
      const rawData = result.data?.data;

      // For some reports data is an object, for others it's an array
      if (!rawData || (Array.isArray(rawData) && rawData.length === 0)) {
        if (reportType === 'incident' && (rawData?.anomalies?.length > 0 || rawData?.incidents?.length > 0)) {
          setReportData(rawData);
        } else if (reportType === 'reliability' && rawData) {
          setReportData(rawData);
        } else {
          setError('No records found for the selected date range.');
          setReportData(null);
        }
      } else {
        setReportData(rawData);
      }

      setReportGenerated(true);
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || err.message || 'Something went wrong';
      setError(msg);
      setReportData(null);
      setReportGenerated(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setError('');
    if (isGenerateDisabled) return;
    try {
      const query = buildReportQuery();
      // POST to the authenticated PDF route — JWT auto-attached by api interceptor
      const response = await api.post(`/reports/export/pdf?${query}`, {}, { responseType: 'blob' });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `cloudsight-report-${reportType}-${fromDate}-to-${toDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || err.message || 'PDF download failed';
      setError(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Reports</h1>
          <p className="text-slate-400 text-sm mt-1">Generate operational insights</p>
        </div>
        {onNavigate && (
          <Button
            variant="outline"
            className="border-nebula-navy-lighter text-slate-300 hover:bg-nebula-navy-lighter hover:text-white"
            onClick={() => onNavigate('reports-history')}
          >
            <History className="size-4 mr-2" />
            Export History
          </Button>
        )}
      </div>

      <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="size-5 text-nebula-cyan" />
            <h2 className="text-lg font-semibold text-white">Report Generator</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label className="text-slate-300 mb-2 block text-sm">Report Type</Label>
              <Select value={reportType || undefined} onValueChange={(value) => setReportType(value as ReportType)}>
                <SelectTrigger className="bg-nebula-navy-dark border-nebula-navy-lighter text-white">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
                  <SelectItem value="infrastructure">Infrastructure Health Report</SelectItem>
                  <SelectItem value="performance">Service Performance Report</SelectItem>
                  <SelectItem value="incident">Incident & Anomaly Report</SelectItem>
                  <SelectItem value="reliability">System Reliability Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-300 mb-2 block text-sm">Scope</Label>
              {reportType === 'infrastructure' ? (
                hosts.length > 0 ? (
                  <Select value={selectedServerId || undefined} onValueChange={setSelectedServerId}>
                    <SelectTrigger className="bg-nebula-navy-dark border-nebula-navy-lighter text-white">
                      <SelectValue placeholder="Select server" />
                    </SelectTrigger>
                    <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
                      {hosts.map((host) => (
                        <SelectItem key={host.server_id} value={host.server_id.toString()}>
                          {host.hostname}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-slate-400 text-sm">Loading servers...</div>
                )
              ) : reportType === 'performance' ? (
                services.length > 0 ? (
                  <Select value={selectedServiceId || undefined} onValueChange={setSelectedServiceId}>
                    <SelectTrigger className="bg-nebula-navy-dark border-nebula-navy-lighter text-white">
                      <SelectValue placeholder="Select service or global" />
                    </SelectTrigger>
                    <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
                      <SelectItem value="global">Global</SelectItem>
                      {services.map((service) => (
                        <SelectItem key={service.service_id} value={service.service_id.toString()}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-slate-400 text-sm">Loading services...</div>
                )
              ) : (
                <div className="text-slate-400 text-sm">Global</div>
              )}
            </div>

            <div>
              <Label className="text-slate-300 mb-2 block text-sm">From Date</Label>
              <input
                type="date"
                value={fromDate}
                max={today}
                onChange={(e) => setFromDate(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="w-full bg-nebula-navy-dark border-nebula-navy-lighter text-white px-3 py-2 rounded [&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>

            <div>
              <Label className="text-slate-300 mb-2 block text-sm">To Date</Label>
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                max={today}
                onChange={(e) => setToDate(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="w-full bg-nebula-navy-dark border-nebula-navy-lighter text-white px-3 py-2 rounded [&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>

            <div className="flex items-end">
              <Button onClick={handleGenerateReport} disabled={isGenerateDisabled || loading} className="w-full bg-gradient-to-r from-nebula-purple to-nebula-blue text-white disabled:opacity-50">
                {loading ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>
          </div>
          {isFutureDateInvalid && (
            <p className="text-red-400 text-sm mt-2">
              Invalid date range: Future dates are not allowed.
            </p>
          )}
          {!isFutureDateInvalid && isDateOrderInvalid && (
            <p className="text-red-400 text-sm mt-2">
              Invalid date range: From Date cannot be later than To Date.
            </p>
          )}
          {error && !isDateInvalid && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </CardContent>
      </Card>

      {reportGenerated && reportData && (
        <div className="space-y-6">
          {(() => {
            const summary = calculateSummary();
            if (!summary) return null;

            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {reportType === 'infrastructure' && (
                  <>
                    <Card className="bg-nebula-navy-light border-nebula-navy-lighter"><CardContent className="p-4"><div className="text-slate-400 text-xs mb-1">Total Records</div><div className="text-white text-2xl font-semibold">{summary.totalRecords}</div></CardContent></Card>
                    <Card className="bg-nebula-navy-light border-nebula-navy-lighter"><CardContent className="p-4"><div className="text-slate-400 text-xs mb-1">Avg CPU</div><div className="text-white text-2xl font-semibold">{summary.avgCpu}%</div></CardContent></Card>
                    <Card className="bg-nebula-navy-light border-nebula-navy-lighter"><CardContent className="p-4"><div className="text-slate-400 text-xs mb-1">Avg Memory</div><div className="text-white text-2xl font-semibold">{summary.avgMemory}%</div></CardContent></Card>
                  </>
                )}
                {reportType === 'performance' && (
                  <>
                    <Card className="bg-nebula-navy-light border-nebula-navy-lighter"><CardContent className="p-4"><div className="text-slate-400 text-xs mb-1">Total Records</div><div className="text-white text-2xl font-semibold">{summary.totalRecords}</div></CardContent></Card>
                    <Card className="bg-nebula-navy-light border-nebula-navy-lighter"><CardContent className="p-4"><div className="text-slate-400 text-xs mb-1">Avg CPU</div><div className="text-white text-2xl font-semibold">{summary.avgCpu}%</div></CardContent></Card>
                    <Card className="bg-nebula-navy-light border-nebula-navy-lighter"><CardContent className="p-4"><div className="text-slate-400 text-xs mb-1">Avg Memory</div><div className="text-white text-2xl font-semibold">{summary.avgMemory}%</div></CardContent></Card>
                  </>
                )}
                {reportType === 'incident' && (
                  <>
                    <Card className="bg-nebula-navy-light border-nebula-navy-lighter"><CardContent className="p-4"><div className="text-slate-400 text-xs mb-1">Total Anomalies</div><div className="text-white text-2xl font-semibold">{summary.totalAnomalies}</div></CardContent></Card>
                    <Card className="bg-nebula-navy-light border-nebula-navy-lighter"><CardContent className="p-4"><div className="text-slate-400 text-xs mb-1">Total Incidents</div><div className="text-white text-2xl font-semibold">{summary.totalIncidents}</div></CardContent></Card>
                  </>
                )}
                {reportType === 'reliability' && (
                  <>
                    <Card className="bg-nebula-navy-light border-nebula-navy-lighter"><CardContent className="p-4"><div className="text-slate-400 text-xs mb-1">System Uptime</div><div className="text-white text-2xl font-semibold">{summary.uptime}%</div></CardContent></Card>
                    <Card className="bg-nebula-navy-light border-nebula-navy-lighter"><CardContent className="p-4"><div className="text-slate-400 text-xs mb-1">MTTD (Seconds)</div><div className="text-white text-2xl font-semibold">{Number(summary.mttd).toFixed(0)}s</div></CardContent></Card>
                    <Card className="bg-nebula-navy-light border-nebula-navy-lighter"><CardContent className="p-4"><div className="text-slate-400 text-xs mb-1">MTTR (Seconds)</div><div className="text-white text-2xl font-semibold">{Number(summary.mttr).toFixed(0)}s</div></CardContent></Card>
                    <Card className="bg-nebula-navy-light border-nebula-navy-lighter"><CardContent className="p-4"><div className="text-slate-400 text-xs mb-1">Downtime (Seconds)</div><div className="text-white text-2xl font-semibold">{Number(summary.downtime).toFixed(0)}s</div></CardContent></Card>
                  </>
                )}
              </div>
            );
          })()}

          <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
            <CardContent className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">Analytics Overview</h2>
              </div>
              
              {reportType === 'infrastructure' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Resource Utilization Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={prepareInfraChartData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="time" stroke="#9CA3AF" fontSize={12} />
                        <YAxis stroke="#9CA3AF" fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff' }} />
                        <Legend />
                        <Line type="monotone" dataKey="cpu" stroke="#06b6d4" name="CPU (%)" dot={false} />
                        <Line type="monotone" dataKey="memory" stroke="#8b5cf6" name="Memory (%)" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              
              {reportType === 'performance' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Service Resource Utilization</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={preparePerformanceChartData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="time" stroke="#9CA3AF" fontSize={12} />
                        <YAxis stroke="#9CA3AF" fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff' }} />
                        <Legend />
                        <Line type="monotone" dataKey="cpu" stroke="#06b6d4" name="CPU (%)" dot={false} />
                        <Line type="monotone" dataKey="memory" stroke="#8b5cf6" name="Memory (%)" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {reportType === 'incident' && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Incidents Over Time</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={prepareIncidentChartData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="time" stroke="#9CA3AF" fontSize={12} />
                      <YAxis stroke="#9CA3AF" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff' }} />
                      <Legend />
                      <Bar dataKey="count" fill="#ef4444" name="Incidents" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              
              {reportType === 'reliability' && (
                <div className="text-slate-400 text-center py-8">
                  Data rendered in summary cards above.
                </div>
              )}

              <Button variant="outline" className="mt-6 border-nebula-navy-lighter text-white hover:bg-nebula-navy-lighter" onClick={handleDownloadPDF}>
                <Download className="size-4 mr-2" />
                Export PDF
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}