import { useState } from 'react';
import { Search, Server, Cpu, HardDrive, Network, Activity } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Host {
  id: string;
  name: string;
  type: string;
  status: string;
  location: string;
}

export function Metrics() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHost, setSelectedHost] = useState<string>('host-1');

  const hosts: Host[] = [
    { id: 'host-1', name: 'prod-web-01', type: 'Web Server', status: 'healthy', location: 'us-east-1a' },
    { id: 'host-2', name: 'prod-web-02', type: 'Web Server', status: 'healthy', location: 'us-east-1b' },
    { id: 'host-3', name: 'prod-db-01', type: 'Database', status: 'degraded', location: 'us-east-1a' },
    { id: 'host-4', name: 'prod-db-02', type: 'Database', status: 'healthy', location: 'us-east-1b' },
    { id: 'host-5', name: 'prod-cache-01', type: 'Cache', status: 'healthy', location: 'us-east-1a' },
    { id: 'host-6', name: 'prod-api-01', type: 'API Server', status: 'healthy', location: 'us-east-1a' },
    { id: 'host-7', name: 'prod-api-02', type: 'API Server', status: 'degraded', location: 'us-east-1b' },
    { id: 'host-8', name: 'staging-web-01', type: 'Web Server', status: 'healthy', location: 'us-west-2a' },
  ];

  const filteredHosts = hosts.filter(host =>
    host.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    host.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    host.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentHost = hosts.find(h => h.id === selectedHost);

  // CPU Utilization Data
  const cpuData = [
    { time: '0', actual: 45, baseline: 40, normalMin: 30, normalMax: 50 },
    { time: '5', actual: 38, baseline: 35, normalMin: 25, normalMax: 45 },
    { time: '10', actual: 62, baseline: 55, normalMin: 45, normalMax: 65 },
    { time: '15', actual: 85, baseline: 55, normalMin: 45, normalMax: 65 },
    { time: '20', actual: 78, baseline: 60, normalMin: 50, normalMax: 70 },
  ];

  // Memory Utilization Data
  const memoryData = [
    { time: '0', actual: 58, baseline: 55, normalMin: 45, normalMax: 65 },
    { time: '5', actual: 55, baseline: 52, normalMin: 42, normalMax: 62 },
    { time: '10', actual: 68, baseline: 60, normalMin: 50, normalMax: 70 },
    { time: '15', actual: 82, baseline: 65, normalMin: 55, normalMax: 75 },
    { time: '20', actual: 88, baseline: 65, normalMin: 55, normalMax: 75 },
  ];

  // Disk I/O Data (MB/s)
  const diskData = [
    { time: '0', actual: 520, baseline: 480, normalMin: 400, normalMax: 550 },
    { time: '5', actual: 485, baseline: 450, normalMin: 370, normalMax: 530 },
    { time: '10', actual: 645, baseline: 580, normalMin: 500, normalMax: 660 },
    { time: '15', actual: 780, baseline: 620, normalMin: 540, normalMax: 700 },
    { time: '20', actual: 720, baseline: 600, normalMin: 520, normalMax: 680 },
  ];

  // Network Traffic Data (Mbps)
  const networkData = [
    { time: '0', actual: 545, baseline: 520, normalMin: 450, normalMax: 590 },
    { time: '5', actual: 498, baseline: 490, normalMin: 420, normalMax: 560 },
    { time: '10', actual: 712, baseline: 650, normalMin: 580, normalMax: 720 },
    { time: '15', actual: 820, baseline: 680, normalMin: 610, normalMax: 750 },
    { time: '20', actual: 758, baseline: 620, normalMin: 550, normalMax: 690 },
  ];

  const MetricChart = ({ 
    title, 
    data, 
    color
  }: { 
    title: string;
    data: any[];
    color: string;
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
                  <stop offset="95%" stopColor={color} stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A1F3A" />
              <XAxis 
                dataKey="time" 
                stroke="#64748B" 
                style={{ fontSize: '12px' }}
                label={{ value: 'Hour', position: 'insideBottom', offset: -5, style: { fill: '#64748B', fontSize: '12px' } }}
              />
              <YAxis 
                stroke="#64748B" 
                style={{ fontSize: '12px' }}
                label={{ value: 'Messages', angle: -90, position: 'insideLeft', style: { fill: '#64748B', fontSize: '12px' } }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0F172A', 
                  border: '1px solid #1E293B',
                  borderRadius: '8px',
                  color: '#F1F5F9',
                  fontSize: '12px'
                }}
              />
              
              {/* Actual Metric Line with Area */}
              <Area 
                type="monotone" 
                dataKey="actual" 
                stroke={color}
                strokeWidth={2}
                fill={`url(#gradient-${title})`}
                name="Current"
              />

              {/* Baseline */}
              <Line 
                type="monotone" 
                dataKey="baseline" 
                stroke="#64748B" 
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
                name="Baseline"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Host Metrics</h1>
        <p className="text-slate-400 text-sm mt-1">Monitor host performance metrics with baseline comparisons</p>
      </div>

      {/* Host Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Search */}
        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-4">
            <Label className="text-white mb-2 block">Search Host</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                placeholder="Search by name, type, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-nebula-navy-dark border-nebula-navy-lighter text-white placeholder:text-slate-500"
              />
            </div>
            {searchQuery && filteredHosts.length > 0 && (
              <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                {filteredHosts.map((host) => (
                  <div
                    key={host.id}
                    onClick={() => {
                      setSelectedHost(host.id);
                      setSearchQuery('');
                    }}
                    className="p-3 bg-nebula-navy-dark rounded cursor-pointer hover:bg-nebula-navy-lighter transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white font-medium">{host.name}</p>
                        <p className="text-xs text-slate-400">{host.type} • {host.location}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        host.status === 'healthy' ? 'bg-green-500/10 text-green-400' :
                        host.status === 'degraded' ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {host.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dropdown Selection */}
        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-4">
            <Label className="text-white mb-2 block">Select Host</Label>
            <Select value={selectedHost} onValueChange={setSelectedHost}>
              <SelectTrigger className="bg-nebula-navy-dark border-nebula-navy-lighter text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white max-h-80">
                {hosts.map((host) => (
                  <SelectItem key={host.id} value={host.id}>
                    <div className="flex items-center gap-3">
                      <Server className="size-4 text-nebula-cyan" />
                      <div>
                        <p className="font-medium">{host.name}</p>
                        <p className="text-xs text-slate-400">{host.type} • {host.location}</p>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Selected Host Info */}
      {currentHost && (
        <Card className="bg-gradient-to-r from-nebula-purple/10 to-nebula-blue/10 border-nebula-purple/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-nebula-purple to-nebula-blue flex items-center justify-center">
                  <Server className="size-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">{currentHost.name}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-slate-400">{currentHost.type}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-sm text-slate-400">{currentHost.location}</span>
                  </div>
                </div>
              </div>
              <div>
                <span className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  currentHost.status === 'healthy' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                  currentHost.status === 'degraded' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                  'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {currentHost.status.toUpperCase()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metric Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricChart
          title="CPU Utilization"
          data={cpuData}
          color="#3B82F6"
        />

        <MetricChart
          title="Memory Utilization"
          data={memoryData}
          color="#3B82F6"
        />

        <MetricChart
          title="Disk I/O"
          data={diskData}
          color="#3B82F6"
        />

        <MetricChart
          title="Network Traffic"
          data={networkData}
          color="#3B82F6"
        />
      </div>
    </div>
  );
}
