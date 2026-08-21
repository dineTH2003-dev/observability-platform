import { useEffect, useState, useMemo } from 'react';
import {
  ArrowLeft,
  Activity,
  Cpu,
  HardDrive,
  Wrench,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Skeleton } from '../../components/ui/skeleton';
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

type TimeRange = '5m' | '15m' | '1h' | '6h' | '24h' | '7d';

const TIME_RANGE_OPTIONS: Array<{ value: TimeRange; label: string; limit: number }> = [
  { value: '5m', label: 'Last 5 min', limit: 30 },
  { value: '15m', label: 'Last 15 min', limit: 15 },
  { value: '1h', label: 'Last 1 hour', limit: 60 },
  { value: '6h', label: 'Last 6 hours', limit: 72 },
  { value: '24h', label: 'Last 24 hours', limit: 96 },
  { value: '7d', label: 'Last 7 days', limit: 168 },
];

function formatAxisLabel(date: Date, timeRange: TimeRange) {
  if (timeRange === '5m') {
    return date.toLocaleTimeString([], { minute: '2-digit', second: '2-digit' });
  }

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
    case '5m':
      return 5;
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

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

const CYAN = '#06b6d4';

function ServiceMetricChart({
  title,
  unit,
  timeRange,
  data,
  dataKey,
}: {
  title: string;
  color?: string;  // kept for API compatibility, not used
  unit: string;
  timeRange: TimeRange;
  data: Array<Record<string, number | string | number[] | null>>;
  dataKey: 'cpu_usage' | 'memory_usage' | 'disk_usage' | 'thread_count';
}) {
  const [isAutoScaled, setIsAutoScaled] = useState(false);
  const chartId = dataKey;

  return (
    <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAutoScaled(!isAutoScaled)}
            className="h-7 text-xs bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-300 gap-1.5 px-2.5 transition-colors"
            title={isAutoScaled ? 'Reset to Fixed 0-100% Scale' : 'Auto Scale Y-Axis to fit values'}
          >
            {isAutoScaled ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-cyan-400 font-medium">Fit Scale</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                <span>0-100% Scale</span>
              </>
            )}
          </Button>
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${chartId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CYAN} stopOpacity={0.15} />
                <stop offset="95%" stopColor={CYAN} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />

            <XAxis
              dataKey="timestamp"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickCount={getTickCount(timeRange)}
              stroke="#475569"
              tick={{ fill: '#64748B', fontSize: 11 }}
              tickLine={false}
              tickFormatter={(value: number) => formatAxisLabel(new Date(value), timeRange)}
            />
            <YAxis
              stroke="#475569"
              tick={{ fill: '#64748B', fontSize: 11 }}
              tickLine={false}
              tickFormatter={(value: number) => `${Number(value).toFixed(value < 1 && value > 0 ? 1 : 0)}${unit}`}
              width={45}
              domain={isAutoScaled ? ['auto', 'auto'] : (unit === '%' ? [0, 100] : [0, 'auto'])}
            />
            <Tooltip
              labelFormatter={(value: number) => formatTooltipLabel(value, timeRange)}
              formatter={(value: number, name: string) => {
                if (name === 'Normal Range' && Array.isArray(value)) {
                  return [`${Number(value[0]).toFixed(1)}% - ${Number(value[1]).toFixed(1)}%`, 'Normal Range'];
                }
                return [`${Number(value).toFixed(2)}${unit}`, 'Value'];
              }}
              contentStyle={{
                backgroundColor: '#0F172A',
                border: '1px solid #1E293B',
                borderRadius: '8px',
                color: '#F1F5F9',
                fontSize: '12px'
              }}
            />

            {/* Cyan real-time metric line */}
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={CYAN}
              strokeWidth={1.5}
              fill={`url(#gradient-${chartId})`}
              fillOpacity={1}
              name="Current"
              dot={false}
              isAnimationActive={false}
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
  const [baselines, setBaselines] = useState<any[]>([]);
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

    // PARALLEL fetch — service info and metrics load simultaneously.
    const loadAll = async () => {
      setIsLoadingService(true);
      setIsLoadingMetrics(true);
      setError(null);

      const rangeConfig = getSelectedRangeConfig(timeRange);

      const [serviceResult, metricsResult] = await Promise.allSettled([
        serviceService.getById(serviceId),
        serviceMetricService.getServiceMetrics(serviceId, timeRange, rangeConfig.limit),
      ]);

      if (ignore) return;

      if (serviceResult.status === 'fulfilled') {
        setService(serviceResult.value);
      } else {
        console.error('Failed to load service details', serviceResult.reason);
        setError('Failed to load service details.');
      }
      setIsLoadingService(false);

      if (metricsResult.status === 'fulfilled') {
        setMetrics(metricsResult.value);
      } else {
        console.error('Failed to load service metrics', metricsResult.reason);
        setError('Failed to load service metrics.');
        setMetrics([]);
      }
      setIsLoadingMetrics(false);

      // Always load 6 hours of baselines so nearest-neighbor matching always succeeds.
      // Service baselines are ~12 min apart; 360 min gives ~30 entries per metric for reliable lookup.
      try {
        const bData = await serviceMetricService.getServiceBaselines(serviceId, 360);
        if (!ignore) setBaselines(bData);
      } catch (bErr) {
        console.warn('Failed to load service baselines', bErr);
      }
    };

    loadAll();

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

  // Build an O(1) lookup map from baselines keyed by "metricName:bucket".
  // Use 15-minute (900s) buckets so the search window covers the ~12 min baseline interval.
  const BASELINE_BUCKET_MS = 15 * 60 * 1000; // 15 minutes
  const baselineMap = useMemo(() => {
    const map = new Map<string, typeof baselines[number]>();
    for (const b of baselines) {
      const bucket = Math.floor(new Date(b.recorded_at).getTime() / BASELINE_BUCKET_MS);
      // Keep the most recent entry per bucket
      const key = `${b.metric_name}:${bucket}`;
      if (!map.has(key)) map.set(key, b);
    }
    return map;
  }, [baselines]);

  const getBounds = (metricName: string, timestamp: number) => {
    const bucket = Math.floor(timestamp / BASELINE_BUCKET_MS);
    // Search ±2 buckets (±30 min total) to cover the ~12 min baseline interval
    return (
      baselineMap.get(`${metricName}:${bucket}`) ??
      baselineMap.get(`${metricName}:${bucket - 1}`) ??
      baselineMap.get(`${metricName}:${bucket + 1}`) ??
      baselineMap.get(`${metricName}:${bucket - 2}`) ??
      baselineMap.get(`${metricName}:${bucket + 2}`) ??
      null
    );
  };

  const chartData = metrics.map((metric) => {
    const ts = new Date(metric.recorded_at).getTime();
    const cpuBounds = getBounds('cpu_avg', ts);
    const memBounds = getBounds('memory_avg', ts);
    const diskBounds = getBounds('disk_avg', ts);
    const threadBounds = getBounds('thread_count_avg', ts);

    const clampPct = (val: number | null) => (val !== null ? Math.max(0, Math.min(100, Number(val))) : null);

    const cpuLower = clampPct(cpuBounds?.lower_bound ?? cpuBounds?.cpu_lower ?? null);
    const cpuUpper = clampPct(cpuBounds?.upper_bound ?? cpuBounds?.cpu_upper ?? null);
    const memLower = clampPct(memBounds?.lower_bound ?? memBounds?.cpu_lower ?? null);
    const memUpper = clampPct(memBounds?.upper_bound ?? memBounds?.cpu_upper ?? null);
    const diskLower = clampPct(diskBounds?.lower_bound ?? diskBounds?.cpu_lower ?? null);
    const diskUpper = clampPct(diskBounds?.upper_bound ?? diskBounds?.cpu_upper ?? null);
    const threadLower = threadBounds?.lower_bound != null ? Number(threadBounds.lower_bound) : (threadBounds?.cpu_lower != null ? Number(threadBounds.cpu_lower) : null);
    const threadUpper = threadBounds?.upper_bound != null ? Number(threadBounds.upper_bound) : (threadBounds?.cpu_upper != null ? Number(threadBounds.cpu_upper) : null);

    const cpuUsage = Math.min(100, Math.max(0, Number(metric.cpu_usage) || 0));
    const memUsage = Math.min(100, Math.max(0, Number(metric.memory_usage) || 0));
    const diskUsage = Math.min(100, Math.max(0, Number(metric.disk_usage) || 0));
    const threadCount = Number(metric.thread_count) || 0;

    const cpuBandWidth = (cpuLower !== null && cpuUpper !== null && cpuUpper >= cpuLower) ? (cpuUpper - cpuLower) : null;
    const memBandWidth = (memLower !== null && memUpper !== null && memUpper >= memLower) ? (memUpper - memLower) : null;
    const diskBandWidth = (diskLower !== null && diskUpper !== null && diskUpper >= diskLower) ? (diskUpper - diskLower) : null;
    const threadBandWidth = (threadLower !== null && threadUpper !== null && threadUpper >= threadLower) ? (threadUpper - threadLower) : null;

    return {
      timestamp: ts,
      cpu_usage: cpuUsage,
      memory_usage: memUsage,
      disk_usage: diskUsage,
      thread_count: threadCount,
      cpu_upper: cpuUpper,
      cpu_lower: cpuLower,
      cpu_band_width: cpuBandWidth,
      cpu_range: (cpuLower !== null && cpuUpper !== null && cpuUpper >= cpuLower) ? [cpuLower, cpuUpper] : null,
      memory_upper: memUpper,
      memory_lower: memLower,
      memory_band_width: memBandWidth,
      memory_range: (memLower !== null && memUpper !== null && memUpper >= memLower) ? [memLower, memUpper] : null,
      disk_upper: diskUpper,
      disk_lower: diskLower,
      disk_band_width: diskBandWidth,
      disk_range: (diskLower !== null && diskUpper !== null && diskUpper >= diskLower) ? [diskLower, diskUpper] : null,
      thread_upper: threadUpper,
      thread_lower: threadLower,
      thread_band_width: threadBandWidth,
      thread_range: (threadLower !== null && threadUpper !== null && threadUpper >= threadLower) ? [threadLower, threadUpper] : null,
      cpu_anomaly: (cpuLower !== null && cpuUsage < cpuLower) || (cpuUpper !== null && cpuUsage > cpuUpper) ? cpuUsage : null,
      memory_anomaly: (memLower !== null && memUsage < memLower) || (memUpper !== null && memUsage > memUpper) ? memUsage : null,
      disk_anomaly: (diskLower !== null && diskUsage < diskLower) || (diskUpper !== null && diskUsage > diskUpper) ? diskUsage : null,
      thread_anomaly: (threadLower !== null && threadCount < threadLower) || (threadUpper !== null && threadCount > threadUpper) ? threadCount : null,
    };
  });

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
        // Chart skeleton cards — shown while data loads in parallel.
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-nebula-navy-light border-nebula-navy-lighter">
              <CardContent className="p-6">
                <Skeleton className="h-5 w-40 mb-4" />
                <Skeleton className="h-[260px] w-full rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
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
            unit="%"
            timeRange={timeRange}
            dataKey="cpu_usage"
          />
          <ServiceMetricChart
            title="Memory Utilization (%)"
            data={chartData}
            unit="%"
            timeRange={timeRange}
            dataKey="memory_usage"
          />
          <ServiceMetricChart
            title="Disk Usage"
            data={chartData}
            unit=""
            timeRange={timeRange}
            dataKey="disk_usage"
          />
          <ServiceMetricChart
            title="Thread Count"
            data={chartData}
            unit=""
            timeRange={timeRange}
            dataKey="thread_count"
          />
        </div>
      )}
    </div>
  );
}
