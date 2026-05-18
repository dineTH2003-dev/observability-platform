import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Activity,
  Cpu,
  HardDrive,
  Loader2,
  TrendingDown,
  TrendingUp,
  Wrench,
} from 'lucide-react';
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
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { serviceService, type Service } from '../../services/serviceService';
import { serviceMetricService, type ServiceMetric } from '../../services/serviceMetricService';
import { useLiveServiceMetrics } from '../../hooks/useLiveServiceMetrics';

interface ServiceMetricsProps {
  serviceId?: number;
  onNavigate?: (page: string) => void;
}

type TimeRange = '15m' | '1h' | '6h' | '24h' | '7d';

const TIME_RANGE_OPTIONS: Array<{ value: TimeRange; label: string; limit: number }> = [
  { value: '15m', label: 'Last 15 min', limit: 15 },
  { value: '1h', label: 'Last 1 hour', limit: 60 },
  { value: '6h', label: 'Last 6 hours', limit: 72 },
  { value: '24h', label: 'Last 24 hours', limit: 96 },
  { value: '7d', label: 'Last 7 days', limit: 168 },
];

function formatAxisLabel(date: Date, timeRange: TimeRange) {
  if (timeRange === '7d') {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  if (timeRange === '24h') {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatTooltipLabel(timestamp: number, timeRange: TimeRange) {
  const date = new Date(timestamp);

  if (timeRange === '7d') {
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTickCount(timeRange: TimeRange) {
  switch (timeRange) {
    case '15m':
      return 4;
    case '1h':
      return 6;
    case '6h':
      return 7;
    case '24h':
      return 6;
    case '7d':
      return 7;
    default:
      return 6;
  }
}

function getSelectedRangeConfig(timeRange: TimeRange) {
  return TIME_RANGE_OPTIONS.find((option) => option.value === timeRange) ?? TIME_RANGE_OPTIONS[1];
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function ServiceMetricChart({
  title,
  color,
  unit,
  timeRange,
  data,
  dataKey,
}: {
  title: string;
  color: string;
  unit: string;
  timeRange: TimeRange;
  data: Array<Record<string, number | string>>;
  dataKey: 'cpu_usage' | 'memory_usage' | 'disk_usage' | 'thread_count';
}) {
  return (
    <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>

        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={data}>
            <defs>
              <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={color} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickCount={getTickCount(timeRange)}
              stroke="#64748B"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#64748B' }}
              tickFormatter={(value: number) => formatAxisLabel(new Date(value), timeRange)}
              label={{ value: 'Hour', position: 'insideBottom', offset: -5, style: { fill: '#64748B', fontSize: '12px' } }}
            />
            <YAxis
              stroke="#64748B"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#64748B' }}
              tickFormatter={(value: number) => `${value}`}
              label={{ value: 'Messages', angle: -90, position: 'insideLeft', style: { fill: '#64748B', fontSize: '12px' } }}
            />
            <Tooltip
              labelFormatter={(value: number) => formatTooltipLabel(value, timeRange)}
              formatter={(value: number) => [
                `${Number(value).toFixed(2)}${unit}`,
                'Current',
              ]}
              contentStyle={{
                backgroundColor: '#0F172A',
                border: '1px solid #1E293B',
                borderRadius: '8px',
                color: '#F1F5F9',
                fontSize: '12px'
              }}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fill={`url(#gradient-${title})`}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function ServiceMetrics({ serviceId, onNavigate }: ServiceMetricsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('1h');
  const [service, setService] = useState<Service | null>(null);
  const [metrics, setMetrics] = useState<ServiceMetric[]>([]);
  const [isLoadingService, setIsLoadingService] = useState(false);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latestMetric = useLiveServiceMetrics(serviceId);

  useEffect(() => {
    if (!serviceId) {
      setError('No service selected.');
      return;
    }

    let ignore = false;

    const loadService = async () => {
      setIsLoadingService(true);
      setError(null);

      try {
        const data = await serviceService.getById(serviceId);
        if (!ignore) {
          setService(data);
        }
      } catch (loadError) {
        if (!ignore) {
          console.error('Failed to load service details', loadError);
          setError('Failed to load service details.');
        }
      } finally {
        if (!ignore) {
          setIsLoadingService(false);
        }
      }
    };

    loadService();

    return () => {
      ignore = true;
    };
  }, [serviceId]);

  useEffect(() => {
    if (!serviceId) return;

    let ignore = false;

    const loadMetrics = async () => {
      setIsLoadingMetrics(true);
      setError(null);

      try {
        const rangeConfig = getSelectedRangeConfig(timeRange);
        const data = await serviceMetricService.getServiceMetrics(serviceId, timeRange, rangeConfig.limit);
        if (!ignore) {
          setMetrics(data);
        }
      } catch (loadError) {
        if (!ignore) {
          console.error('Failed to load service metrics', loadError);
          setError('Failed to load service metrics.');
          setMetrics([]);
        }
      } finally {
        if (!ignore) {
          setIsLoadingMetrics(false);
        }
      }
    };

    loadMetrics();

    return () => {
      ignore = true;
    };
  }, [serviceId, timeRange]);

  useEffect(() => {
    if (!latestMetric) return;

    setMetrics((previous) => {
      const rangeConfig = getSelectedRangeConfig(timeRange);
      const existing = previous.filter((metric) => metric.recorded_at !== latestMetric.recorded_at);
      const next = [...existing, latestMetric].sort(
        (left, right) => new Date(left.recorded_at).getTime() - new Date(right.recorded_at).getTime(),
      );

      if (next.length > rangeConfig.limit) {
        return next.slice(next.length - rangeConfig.limit);
      }

      return next;
    });
  }, [latestMetric, timeRange]);

  const chartData = metrics.map((metric) => ({
    timestamp: new Date(metric.recorded_at).getTime(),
    cpu_usage: Number(metric.cpu_usage) || 0,
    memory_usage: Number(metric.memory_usage) || 0,
    disk_usage: Number(metric.disk_usage) || 0,
    thread_count: Number(metric.thread_count) || 0,
  }));

  const latestCpu = chartData.length ? chartData[chartData.length - 1].cpu_usage : 0;
  const latestMemory = chartData.length ? chartData[chartData.length - 1].memory_usage : 0;
  const latestDisk = chartData.length ? chartData[chartData.length - 1].disk_usage : 0;
  const latestThread = chartData.length ? chartData[chartData.length - 1].thread_count : 0;

  const isLoading = isLoadingService || isLoadingMetrics;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNavigate?.('services')}
            className="text-slate-400 hover:text-white hover:bg-nebula-navy-light"
          >
            <ArrowLeft className="size-5" />
          </Button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-nebula-cyan/10 flex items-center justify-center">
              <Wrench className="size-5 text-nebula-cyan" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">
                {service?.name ?? (isLoadingService ? 'Loading service...' : 'Service Metrics')}
              </h1>
              <p className="text-slate-400 text-sm">
                {(service?.application_name ?? 'No application')} | {(service?.technology ?? 'Unknown technology')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-slate-400 text-sm">Time Range:</Label>
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
            <SelectTrigger className="w-[140px] bg-nebula-navy-light border-nebula-navy-lighter text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
              {TIME_RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4 text-sm text-red-300">{error}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">CPU Usage</p>
                <p className="text-2xl font-semibold text-white mt-1">{formatPercent(latestCpu)}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Cpu className="size-5 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Memory Usage</p>
                <p className="text-2xl font-semibold text-white mt-1">{formatPercent(latestMemory)}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <HardDrive className="size-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Disk Usage</p>
                <p className="text-2xl font-semibold text-white mt-1">{latestDisk.toFixed(1)}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Activity className="size-5 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Thread Count</p>
                <p className="text-2xl font-semibold text-white mt-1">{Math.round(latestThread)}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Activity className="size-5 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-10 flex items-center justify-center gap-3 text-slate-300">
            <Loader2 className="size-5 animate-spin" />
            Loading service metrics from the database...
          </CardContent>
        </Card>
      ) : chartData.length === 0 ? (
        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-10 text-center">
            <Activity className="size-10 text-slate-500 mx-auto mb-3" />
            <p className="text-white font-medium">No service metrics found</p>
            <p className="text-slate-400 text-sm mt-1">
              This service does not have CPU or memory samples in the selected time range.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ServiceMetricChart
            title="CPU Utilization (%)"
            data={chartData}
            color="#06b6d4"
            unit="%"
            timeRange={timeRange}
            dataKey="cpu_usage"
          />
          <ServiceMetricChart
            title="Memory Utilization (%)"
            data={chartData}
            color="#3b82f6"
            unit="%"
            timeRange={timeRange}
            dataKey="memory_usage"
          />
          <ServiceMetricChart
            title="Disk Usage"
            data={chartData}
            color="#f59e0b"
            unit=""
            timeRange={timeRange}
            dataKey="disk_usage"
          />
          <ServiceMetricChart
            title="Thread Count"
            data={chartData}
            color="#8b5cf6"
            unit=""
            timeRange={timeRange}
            dataKey="thread_count"
          />
        </div>
      )}
    </div>
  );
}
