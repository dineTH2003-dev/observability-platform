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
import { FileText, Download } from 'lucide-react';
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

type ReportType = 'server' | 'service' | 'error' | null;

export function Reports() {
  const [reportType, setReportType] = useState<ReportType>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reportGenerated, setReportGenerated] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // New states for dynamic scope
  const [hosts, setHosts] = useState<Host[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

  // Fetch hosts and services on mount
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

  // Reset selected IDs when reportType changes
  useEffect(() => {
    setSelectedServerId('');
    setSelectedServiceId('');
  }, [reportType]);

  // Calculate summary statistics
  const calculateSummary = () => {
    if (!reportData || reportData.length === 0) return null;

    const summary: any = {
      totalRecords: reportData.length,
      latestTimestamp: null,
    };

    if (reportType === 'error') {
      return summary; // Only show total count for error reports
    }

    // Calculate CPU and memory stats for service/server reports
    let cpuValues: number[] = [];
    let memoryValues: number[] = [];
    let latestTime: string | null = null;

    reportData.forEach((row: any) => {
      if (row.cpu_usage !== null && row.cpu_usage !== undefined) {
        cpuValues.push(parseFloat(row.cpu_usage));
      }
      if (row.memory_usage !== null && row.memory_usage !== undefined) {
        memoryValues.push(parseFloat(row.memory_usage));
      }
      if (row.recorded_at) {
        latestTime = row.recorded_at;
      }
    });

    if (cpuValues.length > 0) {
      summary.avgCpu = (cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length).toFixed(2);
      summary.maxCpu = Math.max(...cpuValues).toFixed(2);
      summary.minCpu = Math.min(...cpuValues).toFixed(2);
    }

    if (memoryValues.length > 0) {
      summary.avgMemory = (memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length).toFixed(2);
      summary.maxMemory = Math.max(...memoryValues).toFixed(2);
      summary.minMemory = Math.min(...memoryValues).toFixed(2);
    }

    if (latestTime) {
      summary.latestTimestamp = new Date(latestTime).toLocaleString();
    }

    return summary;
  };

  // Prepare chart data for server/service reports
  const prepareChartData = () => {
    if (!reportData || reportData.length === 0 || reportType === 'error') return [];

    // Sort by recorded_at ascending for time series
    const sortedData = [...reportData].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());

    return sortedData.map((row) => ({
      time: new Date(row.recorded_at).toLocaleString(),
      cpu: row.cpu_usage ? parseFloat(row.cpu_usage) : 0,
      memory: row.memory_usage ? parseFloat(row.memory_usage) : 0,
      timestamp: row.recorded_at,
    }));
  };

  // Prepare chart data for error reports
  const prepareErrorChartData = () => {
    if (!reportData || reportData.length === 0 || reportType !== 'error') return [];

    // Group errors by hour for bar chart
    const grouped: { [key: string]: number } = {};

    reportData.forEach((row) => {
      const date = new Date(row.recorded_at);
      const hourKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
      grouped[hourKey] = (grouped[hourKey] || 0) + 1;
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([time, count]) => ({
        time,
        errors: count,
      }));
  };


  const isGenerateDisabled = !fromDate || !toDate || fromDate > toDate || !reportType || (reportType === 'server' && !selectedServerId);

  const buildReportQuery = () => {
    const params = new URLSearchParams();

    if (reportType) params.append('type', reportType);
    if (fromDate) params.append('from', fromDate);
    if (toDate) params.append('to', toDate);

    let scopeId = null;
    if (reportType === 'server') {
      scopeId = selectedServerId;
    } else if (reportType === 'service') {
      scopeId = selectedServiceId && selectedServiceId !== 'global' ? selectedServiceId : null;
    } // for error, scopeId remains null

    if (scopeId !== null) params.append('scopeId', scopeId);

    return params.toString();
  };

  const parseError = async (response: Response) => {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await response.json().catch(() => null);
      return json?.message || JSON.stringify(json) || response.statusText;
    }
    return response.text().catch(() => response.statusText);
  };

  const handleGenerateReport = async () => {
    setError('');
    if (isGenerateDisabled) return;

    setLoading(true);
    setReportGenerated(false);

    try {
      const query = buildReportQuery();
      const response = await fetch(`${API_BASE}/reports?${query}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const msg = await parseError(response);
        throw new Error(msg || 'Failed to fetch report');
      }

      const result = await response.json();
      const rows = Array.isArray(result.data) ? result.data : [];

      if (rows.length === 0) {
        setError('No records found for selected range');
        setReportData(null);
      } else {
        setReportData(rows);
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
      const query = buildReportQuery();
      const response = await fetch(`${API_BASE}/reports/download?${query}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const msg = await parseError(response);
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
                  <SelectItem value="server">Server Report</SelectItem>
                  <SelectItem value="service">Service Report</SelectItem>
                  <SelectItem value="error">Error Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Scope */}
            <div>
              <Label className="text-slate-300 mb-2 block text-sm">Scope</Label>
              {reportType === 'server' ? (
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
              ) : reportType === 'service' ? (
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
          Parameters: <strong>Type:</strong> {reportType}, <strong>Scope:</strong> {reportType === 'server' ? (hosts.find(h => h.server_id.toString() === selectedServerId)?.hostname || 'N/A') : reportType === 'service' ? (selectedServiceId ? services.find(s => s.service_id.toString() === selectedServiceId)?.name : 'Global') : 'Global'}, <strong>From:</strong> {fromDate}, <strong>To:</strong> {toDate}
        </div>
      )}

      {/* Report Output */}
      {reportGenerated && (
        <div className="space-y-6">
          {reportData && reportData.length > 0 && (() => {
            const summary = calculateSummary();
            return (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
                    <CardContent className="p-4">
                      <div className="text-slate-400 text-xs mb-1">Total Records</div>
                      <div className="text-white text-2xl font-semibold">{summary?.totalRecords || 0}</div>
                    </CardContent>
                  </Card>

                  {reportType !== 'error' && summary?.avgCpu && (
                    <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
                      <CardContent className="p-4">
                        <div className="text-slate-400 text-xs mb-1">Avg CPU</div>
                        <div className="text-white text-2xl font-semibold">{summary.avgCpu}%</div>
                      </CardContent>
                    </Card>
                  )}

                  {reportType !== 'error' && summary?.maxCpu && (
                    <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
                      <CardContent className="p-4">
                        <div className="text-slate-400 text-xs mb-1">Peak CPU</div>
                        <div className="text-white text-2xl font-semibold">{summary.maxCpu}%</div>
                      </CardContent>
                    </Card>
                  )}

                  {reportType !== 'error' && summary?.avgMemory && (
                    <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
                      <CardContent className="p-4">
                        <div className="text-slate-400 text-xs mb-1">Avg Memory</div>
                        <div className="text-white text-2xl font-semibold">{summary.avgMemory}%</div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            );
          })()}

          {/* Charts and Analytics */}
          <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
            <CardContent className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">Report Analytics Overview</h2>
                <p className="text-slate-400 text-sm">Visual summary of system performance trends and operational insights.</p>
              </div>

              {loading ? (
                <div className="text-center text-slate-400 py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nebula-cyan mx-auto mb-4"></div>
                  Loading charts...
                </div>
              ) : reportData && reportData.length > 0 ? (
                <>
                  {/* Charts */}
                  {reportType !== 'error' ? (
                    <div className="space-y-6">
                      {/* CPU Usage Chart */}
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-4">CPU Usage Over Time</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={prepareChartData()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis
                              dataKey="time"
                              stroke="#9CA3AF"
                              fontSize={12}
                              tick={{ fill: '#9CA3AF' }}
                            />
                            <YAxis
                              stroke="#9CA3AF"
                              fontSize={12}
                              tick={{ fill: '#9CA3AF' }}
                              label={{ value: 'CPU %', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#9CA3AF' } }}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '6px',
                                color: '#ffffff',
                              }}
                            />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="cpu"
                              stroke="#06b6d4"
                              strokeWidth={2}
                              name="CPU Usage (%)"
                              dot={{ fill: '#06b6d4', strokeWidth: 2, r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Memory Usage Chart */}
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Memory Usage Over Time</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={prepareChartData()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis
                              dataKey="time"
                              stroke="#9CA3AF"
                              fontSize={12}
                              tick={{ fill: '#9CA3AF' }}
                            />
                            <YAxis
                              stroke="#9CA3AF"
                              fontSize={12}
                              tick={{ fill: '#9CA3AF' }}
                              label={{ value: 'Memory %', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#9CA3AF' } }}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '6px',
                                color: '#ffffff',
                              }}
                            />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="memory"
                              stroke="#8b5cf6"
                              strokeWidth={2}
                              name="Memory Usage (%)"
                              dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Error Occurrences Over Time</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={prepareErrorChartData()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis
                            dataKey="time"
                            stroke="#9CA3AF"
                            fontSize={12}
                            tick={{ fill: '#9CA3AF' }}
                          />
                          <YAxis
                            stroke="#9CA3AF"
                            fontSize={12}
                            tick={{ fill: '#9CA3AF' }}
                            label={{ value: 'Error Count', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#9CA3AF' } }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1e293b',
                              border: '1px solid #334155',
                              borderRadius: '6px',
                              color: '#ffffff',
                            }}
                          />
                          <Legend />
                          <Bar
                            dataKey="errors"
                            fill="#ef4444"
                            name="Error Count"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Export PDF Button */}
                  <Button
                    variant="outline"
                    className="mt-6 border-nebula-navy-lighter text-white hover:bg-nebula-navy-lighter"
                    onClick={handleDownloadPDF}
                  >
                    <Download className="size-4 mr-2" />
                    Export PDF (All {reportData.length} Records)
                  </Button>
                </>
              ) : (
                <p className="text-red-400 text-center py-8">No records for the selected range</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}