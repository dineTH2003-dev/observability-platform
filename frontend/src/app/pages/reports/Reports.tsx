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
import { FileText, TrendingUp, AlertCircle, Clock, Activity, Calendar, Download } from 'lucide-react';
import { ComposedChart, BarChart, LineChart, PieChart, Pie, Cell, Line, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type ReportType = 'system-health' | 'incident-anomaly' | 'mttr-mttd' | 'service-health' | null;

export function Reports() {
  const [reportType, setReportType] = useState<ReportType>(null);
  const [scope, setScope] = useState('global');
  const [timeRange, setTimeRange] = useState('last-7-days');

  const handleGenerateReport = () => {
    if (!reportType) {
      setReportType('system-health');
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

            {/* Time Range */}
            <div>
              <Label className="text-slate-300 mb-2 block text-sm">Time Range</Label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="bg-nebula-navy-dark border-nebula-navy-lighter text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
                  <SelectItem value="last-7-days">Last 7 days</SelectItem>
                  <SelectItem value="last-30-days">Last 30 days</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Generate Button */}
            <div className="flex items-end">
              <Button
                onClick={handleGenerateReport}
                disabled={!reportType}
                className="w-full bg-gradient-to-r from-nebula-purple to-nebula-blue hover:from-nebula-purple/90 hover:to-nebula-blue/90 text-white"
              >
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Output Area */}
      {reportType === 'system-health' && <SystemHealthReport timeRange={timeRange} scope={scope} />}
      {reportType === 'incident-anomaly' && <IncidentAnomalyReport timeRange={timeRange} scope={scope} />}
      {reportType === 'mttr-mttd' && <MTTRMTTDReport timeRange={timeRange} scope={scope} />}
      {reportType === 'service-health' && <ServiceHealthReport timeRange={timeRange} scope={scope} />}
    </div>
  );
}

// Report 1: System Health & Uptime
function SystemHealthReport({ timeRange, scope }: { timeRange: string; scope: string }) {
  const healthTrendData = [
    { time: 'Mon', health: 98.5 },
    { time: 'Tue', health: 97.2 },
    { time: 'Wed', health: 99.1 },
    { time: 'Thu', health: 96.8 },
    { time: 'Fri', health: 98.9 },
    { time: 'Sat', health: 99.5 },
    { time: 'Sun', health: 99.2 },
  ];

  const uptimeData = [
    { day: 'Mon', uptime: 23.5, downtime: 0.5 },
    { day: 'Tue', uptime: 22.8, downtime: 1.2 },
    { day: 'Wed', uptime: 23.8, downtime: 0.2 },
    { day: 'Thu', uptime: 22.5, downtime: 1.5 },
    { day: 'Fri', uptime: 23.7, downtime: 0.3 },
    { day: 'Sat', uptime: 24, downtime: 0 },
    { day: 'Sun', uptime: 23.9, downtime: 0.1 },
  ];

  const downtimeData = [
    { date: '2026-02-01', health: 98.5, downtime: 30, status: 'Met' },
    { date: '2026-02-02', health: 97.2, downtime: 72, status: 'Met' },
    { date: '2026-02-03', health: 99.1, downtime: 12, status: 'Met' },
    { date: '2026-02-04', health: 96.8, downtime: 90, status: 'Breached' },
    { date: '2026-02-05', health: 98.9, downtime: 18, status: 'Met' },
  ];

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">System Health & Uptime Report</h2>
          <p className="text-sm text-slate-400 mt-1">
            {scope.charAt(0).toUpperCase() + scope.slice(1)} • {timeRange.replace(/-/g, ' ')}
          </p>
        </div>
        <Button variant="outline" className="border-nebula-navy-lighter text-white hover:bg-nebula-navy-lighter">
          <Download className="size-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Avg System Health</p>
                <p className="text-3xl font-bold text-green-400">98.3%</p>
              </div>
              <Activity className="size-8 text-green-400/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Uptime</p>
                <p className="text-3xl font-bold text-green-400">99.7%</p>
              </div>
              <TrendingUp className="size-8 text-green-400/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Total Downtime</p>
                <p className="text-3xl font-bold text-yellow-400">222m</p>
              </div>
              <Clock className="size-8 text-yellow-400/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">SLA Status</p>
                <p className="text-3xl font-bold text-green-400">Met</p>
              </div>
              <Calendar className="size-8 text-green-400/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: System Health Trend */}
        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">System Health Trend</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={healthTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="time" stroke="#64748B" style={{ fontSize: '12px' }} />
                <YAxis stroke="#64748B" style={{ fontSize: '12px' }} domain={[95, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    border: '1px solid #1E293B',
                    borderRadius: '8px',
                    color: '#F1F5F9'
                  }}
                />
                <Line type="monotone" dataKey="health" stroke="#10B981" strokeWidth={3} name="Health %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 2: Uptime vs Downtime */}
        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Uptime vs Downtime (Hours)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={uptimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="day" stroke="#64748B" style={{ fontSize: '12px' }} />
                <YAxis stroke="#64748B" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    border: '1px solid #1E293B',
                    borderRadius: '8px',
                    color: '#F1F5F9'
                  }}
                />
                <Legend />
                <Bar dataKey="uptime" fill="#10B981" name="Uptime" />
                <Bar dataKey="downtime" fill="#EF4444" name="Downtime" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Supporting Table */}
      <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Downtime Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-nebula-navy-lighter">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Health %</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Downtime (min)</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {downtimeData.map((row, idx) => (
                  <tr key={idx} className="border-b border-nebula-navy-lighter/50 hover:bg-nebula-navy-dark/50">
                    <td className="py-3 px-4 text-sm text-white">{row.date}</td>
                    <td className="py-3 px-4 text-sm text-white">{row.health}%</td>
                    <td className="py-3 px-4 text-sm text-white">{row.downtime}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        row.status === 'Met' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Report 2: Incident & Anomaly Summary
function IncidentAnomalyReport({ timeRange, scope }: { timeRange: string; scope: string }) {
  const incidentsBySeverity = [
    { severity: 'Critical', count: 8 },
    { severity: 'High', count: 15 },
    { severity: 'Medium', count: 23 },
  ];

  const anomaliesOverTime = [
    { day: 'Mon', anomalies: 12 },
    { day: 'Tue', anomalies: 18 },
    { day: 'Wed', anomalies: 8 },
    { day: 'Thu', anomalies: 25 },
    { day: 'Fri', anomalies: 14 },
    { day: 'Sat', anomalies: 6 },
    { day: 'Sun', anomalies: 10 },
  ];

  const topAffectedResources = [
    { resource: 'prod-db-01', anomalyCount: 18, avgSeverity: 'High' },
    { resource: 'prod-api-02', anomalyCount: 15, avgSeverity: 'Medium' },
    { resource: 'prod-web-01', anomalyCount: 12, avgSeverity: 'Critical' },
    { resource: 'prod-cache-01', anomalyCount: 9, avgSeverity: 'Medium' },
    { resource: 'staging-web-01', anomalyCount: 7, avgSeverity: 'Low' },
  ];

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Incident & Anomaly Summary</h2>
          <p className="text-sm text-slate-400 mt-1">
            {scope.charAt(0).toUpperCase() + scope.slice(1)} • {timeRange.replace(/-/g, ' ')}
          </p>
        </div>
        <Button variant="outline" className="border-nebula-navy-lighter text-white hover:bg-nebula-navy-lighter">
          <Download className="size-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Total Incidents</p>
                <p className="text-3xl font-bold text-white">46</p>
              </div>
              <AlertCircle className="size-8 text-slate-400/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Critical Incidents</p>
                <p className="text-3xl font-bold text-red-400">8</p>
              </div>
              <AlertCircle className="size-8 text-red-400/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Total Anomalies</p>
                <p className="text-3xl font-bold text-yellow-400">93</p>
              </div>
              <Activity className="size-8 text-yellow-400/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Most Affected</p>
                <p className="text-lg font-bold text-white">prod-db-01</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Incidents by Severity */}
        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Incidents by Severity</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={incidentsBySeverity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="severity" stroke="#64748B" style={{ fontSize: '12px' }} />
                <YAxis stroke="#64748B" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    border: '1px solid #1E293B',
                    borderRadius: '8px',
                    color: '#F1F5F9'
                  }}
                />
                <Bar dataKey="count" fill="#3B82F6" name="Incidents" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 2: Anomalies Over Time */}
        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Anomalies Over Time</h3>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={anomaliesOverTime}>
                <defs>
                  <linearGradient id="anomalyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="day" stroke="#64748B" style={{ fontSize: '12px' }} />
                <YAxis stroke="#64748B" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    border: '1px solid #1E293B',
                    borderRadius: '8px',
                    color: '#F1F5F9'
                  }}
                />
                <Area type="monotone" dataKey="anomalies" stroke="#F59E0B" strokeWidth={2} fill="url(#anomalyGrad)" name="Anomalies" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Supporting Table */}
      <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top Affected Resources</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-nebula-navy-lighter">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Resource Name</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Anomaly Count</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Avg Severity</th>
                </tr>
              </thead>
              <tbody>
                {topAffectedResources.map((row, idx) => (
                  <tr key={idx} className="border-b border-nebula-navy-lighter/50 hover:bg-nebula-navy-dark/50">
                    <td className="py-3 px-4 text-sm text-white font-medium">{row.resource}</td>
                    <td className="py-3 px-4 text-sm text-white">{row.anomalyCount}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        row.avgSeverity === 'Critical' ? 'bg-red-500/10 text-red-400' :
                        row.avgSeverity === 'High' ? 'bg-orange-500/10 text-orange-400' :
                        row.avgSeverity === 'Medium' ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-blue-500/10 text-blue-400'
                      }`}>
                        {row.avgSeverity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Report 3: MTTR / MTTD Report
function MTTRMTTDReport({ timeRange, scope }: { timeRange: string; scope: string }) {
  const mttrTrendData = [
    { day: 'Mon', mttr: 45, mttd: 12 },
    { day: 'Tue', mttr: 52, mttd: 15 },
    { day: 'Wed', mttr: 38, mttd: 10 },
    { day: 'Thu', mttr: 48, mttd: 18 },
    { day: 'Fri', mttr: 42, mttd: 14 },
    { day: 'Sat', mttr: 35, mttd: 8 },
    { day: 'Sun', mttr: 40, mttd: 11 },
  ];

  const incidentPerformance = [
    { id: 'INC-2301', severity: 'Critical', mttd: 8, mttr: 35, engineer: 'Sarah Chen' },
    { id: 'INC-2302', severity: 'High', mttd: 15, mttr: 52, engineer: 'Mike Johnson' },
    { id: 'INC-2303', severity: 'Medium', mttd: 10, mttr: 38, engineer: 'Alex Kumar' },
    { id: 'INC-2304', severity: 'Critical', mttd: 18, mttr: 48, engineer: 'Emma Davis' },
    { id: 'INC-2305', severity: 'High', mttd: 12, mttr: 42, engineer: 'Sarah Chen' },
  ];

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">MTTR / MTTD Performance Report</h2>
          <p className="text-sm text-slate-400 mt-1">
            {scope.charAt(0).toUpperCase() + scope.slice(1)} • {timeRange.replace(/-/g, ' ')}
          </p>
        </div>
        <Button variant="outline" className="border-nebula-navy-lighter text-white hover:bg-nebula-navy-lighter">
          <Download className="size-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Average MTTD</p>
                <p className="text-3xl font-bold text-nebula-cyan">12m</p>
              </div>
              <Clock className="size-8 text-nebula-cyan/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Average MTTR</p>
                <p className="text-3xl font-bold text-nebula-purple">43m</p>
              </div>
              <Clock className="size-8 text-nebula-purple/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Fastest Resolution</p>
                <p className="text-3xl font-bold text-green-400">35m</p>
              </div>
              <TrendingUp className="size-8 text-green-400/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Slowest Resolution</p>
                <p className="text-3xl font-bold text-red-400">52m</p>
              </div>
              <AlertCircle className="size-8 text-red-400/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: MTTR Trend */}
        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">MTTR Trend (Minutes)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={mttrTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="day" stroke="#64748B" style={{ fontSize: '12px' }} />
                <YAxis stroke="#64748B" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    border: '1px solid #1E293B',
                    borderRadius: '8px',
                    color: '#F1F5F9'
                  }}
                />
                <Line type="monotone" dataKey="mttr" stroke="#A855F7" strokeWidth={3} name="MTTR" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 2: MTTD vs MTTR */}
        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">MTTD vs MTTR Comparison</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={mttrTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="day" stroke="#64748B" style={{ fontSize: '12px' }} />
                <YAxis stroke="#64748B" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    border: '1px solid #1E293B',
                    borderRadius: '8px',
                    color: '#F1F5F9'
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="mttd" stroke="#06B6D4" strokeWidth={2} name="MTTD" />
                <Line type="monotone" dataKey="mttr" stroke="#A855F7" strokeWidth={2} name="MTTR" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Supporting Table */}
      <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Incident Performance Details</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-nebula-navy-lighter">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Incident ID</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Severity</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">MTTD (min)</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">MTTR (min)</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Assigned Engineer</th>
                </tr>
              </thead>
              <tbody>
                {incidentPerformance.map((row, idx) => (
                  <tr key={idx} className="border-b border-nebula-navy-lighter/50 hover:bg-nebula-navy-dark/50">
                    <td className="py-3 px-4 text-sm text-white font-medium">{row.id}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        row.severity === 'Critical' ? 'bg-red-500/10 text-red-400' :
                        row.severity === 'High' ? 'bg-orange-500/10 text-orange-400' :
                        'bg-yellow-500/10 text-yellow-400'
                      }`}>
                        {row.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-nebula-cyan">{row.mttd}</td>
                    <td className="py-3 px-4 text-sm text-nebula-purple">{row.mttr}</td>
                    <td className="py-3 px-4 text-sm text-slate-300">{row.engineer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Report 4: Service Health & Impact
function ServiceHealthReport({ timeRange, scope }: { timeRange: string; scope: string }) {
  const serviceHealthRanking = [
    { service: 'Auth Service', health: 99.5 },
    { service: 'Payment Gateway', health: 98.2 },
    { service: 'API Gateway', health: 97.8 },
    { service: 'Database Service', health: 95.3 },
    { service: 'Cache Layer', health: 94.5 },
    { service: 'Message Queue', health: 92.1 },
  ];

  const healthDistribution = [
    { name: 'Healthy', value: 18, color: '#10B981' },
    { name: 'Degraded', value: 5, color: '#F59E0B' },
    { name: 'Critical', value: 2, color: '#EF4444' },
  ];

  const serviceDetails = [
    { service: 'Auth Service', health: 99.5, incidents: 2, anomalies: 5 },
    { service: 'Payment Gateway', health: 98.2, incidents: 4, anomalies: 8 },
    { service: 'API Gateway', health: 97.8, incidents: 6, anomalies: 12 },
    { service: 'Database Service', health: 95.3, incidents: 9, anomalies: 18 },
    { service: 'Cache Layer', health: 94.5, incidents: 7, anomalies: 15 },
  ];

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Service Health & Impact Report</h2>
          <p className="text-sm text-slate-400 mt-1">
            {scope.charAt(0).toUpperCase() + scope.slice(1)} • {timeRange.replace(/-/g, ' ')}
          </p>
        </div>
        <Button variant="outline" className="border-nebula-navy-lighter text-white hover:bg-nebula-navy-lighter">
          <Download className="size-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Total Services</p>
                <p className="text-3xl font-bold text-white">25</p>
              </div>
              <Activity className="size-8 text-slate-400/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Healthy Services</p>
                <p className="text-3xl font-bold text-green-400">18</p>
              </div>
              <Activity className="size-8 text-green-400/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Degraded Services</p>
                <p className="text-3xl font-bold text-yellow-400">5</p>
              </div>
              <AlertCircle className="size-8 text-yellow-400/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Critical Services</p>
                <p className="text-3xl font-bold text-red-400">2</p>
              </div>
              <AlertCircle className="size-8 text-red-400/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Service Health Ranking */}
        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Service Health Ranking</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={serviceHealthRanking} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis type="number" stroke="#64748B" style={{ fontSize: '12px' }} domain={[0, 100]} />
                <YAxis type="category" dataKey="service" stroke="#64748B" style={{ fontSize: '11px' }} width={120} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    border: '1px solid #1E293B',
                    borderRadius: '8px',
                    color: '#F1F5F9'
                  }}
                />
                <Bar dataKey="health" fill="#3B82F6" name="Health %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 2: Health Distribution */}
        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Health Distribution</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={healthDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {healthDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    border: '1px solid #1E293B',
                    borderRadius: '8px',
                    color: '#F1F5F9'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Supporting Table */}
      <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Service Impact Details</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-nebula-navy-lighter">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Service Name</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Health %</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Incident Count</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Anomaly Count</th>
                </tr>
              </thead>
              <tbody>
                {serviceDetails.map((row, idx) => (
                  <tr key={idx} className="border-b border-nebula-navy-lighter/50 hover:bg-nebula-navy-dark/50">
                    <td className="py-3 px-4 text-sm text-white font-medium">{row.service}</td>
                    <td className="py-3 px-4">
                      <span className={`text-sm font-semibold ${
                        row.health >= 98 ? 'text-green-400' :
                        row.health >= 95 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {row.health}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-white">{row.incidents}</td>
                    <td className="py-3 px-4 text-sm text-white">{row.anomalies}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
