import { useState } from 'react';
import { ArrowLeft, Wrench, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ServiceMetricsProps {
  serviceId?: number;
  onNavigate?: (page: string) => void;
}

export function ServiceMetrics({ serviceId, onNavigate }: ServiceMetricsProps) {
  const [timeRange, setTimeRange] = useState('1h');

  // Mock service data
  const serviceData = {
    id: serviceId || 1,
    name: 'user-api',
    technology: 'Java',
    health: 'warning',
    application: 'User Management'
  };

  // Response Time Data (ms)
  const responseTimeData = [
    { time: '0', actual: 145, baseline: 120, normalMin: 100, normalMax: 150 },
    { time: '5', actual: 138, baseline: 115, normalMin: 95, normalMax: 135 },
    { time: '10', actual: 162, baseline: 125, normalMin: 105, normalMax: 145 },
    { time: '15', actual: 185, baseline: 130, normalMin: 110, normalMax: 150 },
    { time: '20', actual: 178, baseline: 125, normalMin: 105, normalMax: 145 },
  ];

  // Request Rate Data (req/s)
  const requestRateData = [
    { time: '0', actual: 245, baseline: 220, normalMin: 200, normalMax: 250 },
    { time: '5', actual: 238, baseline: 215, normalMin: 195, normalMax: 235 },
    { time: '10', actual: 312, baseline: 250, normalMin: 230, normalMax: 270 },
    { time: '15', actual: 380, baseline: 280, normalMin: 260, normalMax: 300 },
    { time: '20', actual: 358, baseline: 270, normalMin: 250, normalMax: 290 },
  ];

  // Error Rate Data (%)
  const errorRateData = [
    { time: '0', actual: 0.5, baseline: 0.3, normalMin: 0.1, normalMax: 0.5 },
    { time: '5', actual: 0.4, baseline: 0.3, normalMin: 0.1, normalMax: 0.5 },
    { time: '10', actual: 1.2, baseline: 0.4, normalMin: 0.2, normalMax: 0.6 },
    { time: '15', actual: 2.5, baseline: 0.5, normalMin: 0.3, normalMax: 0.7 },
    { time: '20', actual: 1.8, baseline: 0.4, normalMin: 0.2, normalMax: 0.6 },
  ];

  // CPU Utilization Data (%)
  const cpuData = [
    { time: '0', actual: 45, baseline: 40, normalMin: 30, normalMax: 50 },
    { time: '5', actual: 38, baseline: 35, normalMin: 25, normalMax: 45 },
    { time: '10', actual: 62, baseline: 55, normalMin: 45, normalMax: 65 },
    { time: '15', actual: 75, baseline: 60, normalMin: 50, normalMax: 70 },
    { time: '20', actual: 68, baseline: 55, normalMin: 45, normalMax: 65 },
  ];

  const MetricChart = ({ 
    title, 
    data, 
    color,
    unit
  }: { 
    title: string;
    data: any[];
    color: string;
    unit: string;
  }) => {
    return (
      <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>

          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={data}>
              <defs>
                <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.25}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis 
                dataKey="time" 
                stroke="#64748b"
                tick={{ fill: '#64748b' }}
              />
              <YAxis 
                stroke="#64748b"
                tick={{ fill: '#64748b' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                formatter={(value: number) => [`${value}${unit}`, '']}
              />
              <Area
                type="monotone"
                dataKey="normalMax"
                stackId="1"
                stroke="none"
                fill="#334155"
                fillOpacity={0.2}
              />
              <Area
                type="monotone"
                dataKey="normalMin"
                stackId="1"
                stroke="none"
                fill="transparent"
              />
              <Line
                type="monotone"
                dataKey="baseline"
                stroke="#64748b"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke={color}
                strokeWidth={2.5}
                dot={{ fill: color, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNavigate?.('services')}
            className="text-slate-400 hover:text-white hover:bg-nebula-navy-light"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-nebula-cyan/10 flex items-center justify-center">
                <Wrench className="size-5 text-nebula-cyan" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-white">{serviceData.name}</h1>
                <p className="text-slate-400 text-sm">{serviceData.application} • {serviceData.technology}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-slate-400 text-sm">Time Range:</Label>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px] bg-nebula-navy-light border-nebula-navy-lighter text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
                <SelectItem value="15m">Last 15 min</SelectItem>
                <SelectItem value="1h">Last 1 hour</SelectItem>
                <SelectItem value="6h">Last 6 hours</SelectItem>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Key Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Avg Response Time</p>
                <p className="text-2xl font-semibold text-white mt-1">162ms</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Activity className="size-5 text-purple-400" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="size-3 text-red-400" />
              <span className="text-xs text-red-400">+12% from baseline</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Request Rate</p>
                <p className="text-2xl font-semibold text-white mt-1">307/s</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Activity className="size-5 text-blue-400" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="size-3 text-green-400" />
              <span className="text-xs text-green-400">+15% from baseline</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Error Rate</p>
                <p className="text-2xl font-semibold text-white mt-1">1.4%</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Activity className="size-5 text-red-400" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="size-3 text-red-400" />
              <span className="text-xs text-red-400">+250% from baseline</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">CPU Usage</p>
                <p className="text-2xl font-semibold text-white mt-1">58%</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Activity className="size-5 text-cyan-400" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2">
              <TrendingDown className="size-3 text-green-400" />
              <span className="text-xs text-green-400">-5% from baseline</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metrics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricChart
          title="Response Time (ms)"
          data={responseTimeData}
          color="#a855f7"
          unit="ms"
        />
        <MetricChart
          title="Request Rate (req/s)"
          data={requestRateData}
          color="#3b82f6"
          unit=" req/s"
        />
        <MetricChart
          title="Error Rate (%)"
          data={errorRateData}
          color="#ef4444"
          unit="%"
        />
        <MetricChart
          title="CPU Utilization (%)"
          data={cpuData}
          color="#06b6d4"
          unit="%"
        />
      </div>
    </div>
  );
}

