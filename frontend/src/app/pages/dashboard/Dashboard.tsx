import { Server, Box, Activity, AlertTriangle, TrendingUp, Home, DollarSign, Clock, CheckCircle, XCircle, AlertCircle, Users, Lightbulb, Wrench, TrendingDown, Cpu, HardDrive, Network, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface DashboardProps {
  onNavigate: (page: string, anomalyId?: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  // KPI Stats
  const stats = [
    { 
      label: 'System Health', 
      value: '87',
      unit: '/100',
      icon: Activity, 
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-400',
      trend: '+3%'
    },
    { 
      label: 'Open Incidents', 
      value: '4',
      icon: AlertCircle, 
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-400'
    },
    { 
      label: 'Active Anomalies', 
      value: '8',
      icon: AlertTriangle, 
      iconBg: 'bg-orange-500/10',
      iconColor: 'text-orange-400'
    },
    { 
      label: 'Avg MTTD', 
      value: '2.3',
      unit: 'min',
      icon: Clock, 
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-400',
      trend: '-15%'
    },
    { 
      label: 'Avg MTTR', 
      value: '18',
      unit: 'min',
      icon: TrendingUp, 
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-400',
      trend: '-12%'
    },
    { 
      label: 'Recommendations', 
      value: '6',
      icon: Lightbulb, 
      iconBg: 'bg-yellow-500/10',
      iconColor: 'text-yellow-400'
    },
  ];

  // Anomaly Trend with baseline data
  const anomalyTrendData = [
    { time: '00:00', anomalies: 3, baseline: 2, normalMin: 1, normalMax: 4 },
    { time: '04:00', anomalies: 2, baseline: 2, normalMin: 1, normalMax: 4 },
    { time: '08:00', anomalies: 5, baseline: 3, normalMin: 2, normalMax: 5 },
    { time: '12:00', anomalies: 12, baseline: 3, normalMin: 2, normalMax: 5 },
    { time: '16:00', anomalies: 8, baseline: 3, normalMin: 2, normalMax: 5 },
    { time: '20:00', anomalies: 4, baseline: 2, normalMin: 1, normalMax: 4 },
    { time: '24:00', anomalies: 3, baseline: 2, normalMin: 1, normalMax: 4 },
  ];

  // Open Incidents
  const openIncidents = [
    { 
      id: 'INC-342', 
      title: 'High CPU utilization on prod-db-01', 
      severity: 'critical', 
      status: 'open',
      assignedTo: 'Unassigned',
      duration: '2h 10m',
      hasRecommendation: true
    },
    { 
      id: 'INC-341', 
      title: 'Memory leak detected in API Gateway', 
      severity: 'high', 
      status: 'acknowledged',
      assignedTo: 'Alex Martinez',
      duration: '2h 32m',
      hasRecommendation: true
    },
    { 
      id: 'INC-339', 
      title: 'Elevated error rate in authentication', 
      severity: 'high', 
      status: 'open',
      assignedTo: 'Unassigned',
      duration: '47m',
      hasRecommendation: false
    },
    { 
      id: 'INC-338', 
      title: 'Slow query performance on reports DB', 
      severity: 'medium', 
      status: 'open',
      assignedTo: 'Sarah Chen',
      duration: '1h 15m',
      hasRecommendation: true
    },
  ];

  // Top Affected Resources
  const topAffectedResources = [
    { name: 'prod-db-01 / User Service', health: 65, status: 'critical', anomalyCount: 3 },
    { name: 'API Gateway / gateway', health: 72, status: 'degraded', anomalyCount: 2 },
    { name: 'Auth Service / auth-api', health: 85, status: 'degraded', anomalyCount: 1 },
    { name: 'Payment Service / payment-db', health: 92, status: 'healthy', anomalyCount: 1 },
     {name: 'prod-db-01 / Analytics Engine', health: 97, status: 'healthy', anomalyCount: 1 },
  ];


  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'high':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'low':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-500/10 text-blue-400';
      case 'acknowledged':
        return 'bg-purple-500/10 text-purple-400';
      case 'resolved':
        return 'bg-green-500/10 text-green-400';
      default:
        return 'bg-slate-500/10 text-slate-400';
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-400';
      case 'degraded':
        return 'text-yellow-400';
      case 'critical':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  // Metrics Overview Data
  const metricsOverview = [
    {
      label: 'CPU Usage',
      icon: Cpu,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-400',
      current: 68,
      average: 55,
      status: 'elevated',
      data: [45, 52, 48, 62, 58, 68]
    },
    {
      label: 'Memory',
      icon: Activity,
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-400',
      current: 72,
      average: 65,
      status: 'elevated',
      data: [60, 65, 63, 70, 68, 72]
    },
    {
      label: 'Disk I/O',
      icon: HardDrive,
      iconBg: 'bg-cyan-500/10',
      iconColor: 'text-cyan-400',
      current: 45,
      average: 48,
      status: 'normal',
      data: [55, 50, 48, 45, 47, 45]
    },
    {
      label: 'Network',
      icon: Network,
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-400',
      current: 52,
      average: 50,
      status: 'normal',
      data: [48, 50, 51, 49, 53, 52]
    },
  ];

  const getMetricStatusColor = (status: string) => {
    switch (status) {
      case 'elevated':
        return 'text-yellow-400';
      case 'critical':
        return 'text-red-400';
      default:
        return 'text-green-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">System Reliability Overview</h1>
        <p className="text-slate-400 text-sm mt-1">Monitor overall system health and manage incidents</p>
      </div>

      {/* System Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* System Health */}
        <Card className="bg-nebula-navy-light border-nebula-navy-lighter hover:border-nebula-cyan/50 transition-colors cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                <Activity className="size-6 text-green-400" />
              </div>
              <span className="text-xs text-slate-400">Last 24h</span>
            </div>
            <h3 className="text-sm text-slate-400 mb-1">System Health</h3>
            <p className="text-3xl font-bold text-white mb-2">98.5%</p>
          </CardContent>
        </Card>

        {/* Hosts */}
        <Card className="bg-nebula-navy-light border-nebula-navy-lighter hover:border-nebula-purple/50 transition-colors cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-nebula-purple/20 to-nebula-blue/20 flex items-center justify-center">
                <Server className="size-6 text-nebula-purple" />
              </div>
              <span className="text-xs text-slate-400">Active</span>
            </div>
            <h3 className="text-sm text-slate-400 mb-1">Hosts</h3>
            <p className="text-3xl font-bold text-white mb-2">248</p>
          </CardContent>
        </Card>

        {/* Applications */}
        <Card className="bg-nebula-navy-light border-nebula-navy-lighter hover:border-nebula-blue/50 transition-colors cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-nebula-blue/20 to-nebula-cyan/20 flex items-center justify-center">
                <Box className="size-6 text-nebula-blue" />
              </div>
              <span className="text-xs text-slate-400">Monitored</span>
            </div>
            <h3 className="text-sm text-slate-400 mb-1">Applications</h3>
            <p className="text-3xl font-bold text-white mb-2">42</p>
          </CardContent>
        </Card>

        {/* Services */}
        <Card className="bg-nebula-navy-light border-nebula-navy-lighter hover:border-nebula-cyan/50 transition-colors cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-nebula-cyan/20 to-nebula-blue/20 flex items-center justify-center">
                <Wrench className="size-6 text-nebula-cyan" />
              </div>
              <span className="text-xs text-slate-400">Deployed</span>
            </div>
            <h3 className="text-sm text-slate-400 mb-1">Services</h3>
            <p className="text-3xl font-bold text-white mb-2">156</p>
          </CardContent>
        </Card>

        {/* Active Anomalies */}
        <Card 
          className="bg-nebula-navy-light border-nebula-navy-lighter hover:border-yellow-500/50 transition-colors cursor-pointer"
          onClick={() => onNavigate('anomalies')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                <AlertTriangle className="size-6 text-yellow-400" />
              </div>
              <span className="text-xs text-slate-400">Detected</span>
            </div>
            <h3 className="text-sm text-slate-400 mb-1">Active Anomalies</h3>
            <p className="text-3xl font-bold text-white mb-2">23</p>
          </CardContent>
        </Card>

        {/* Open Incidents */}
        <Card 
          className="bg-nebula-navy-light border-nebula-navy-lighter hover:border-red-500/50 transition-colors cursor-pointer"
          onClick={() => onNavigate('incidents')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center">
                <AlertCircle className="size-6 text-red-400" />
              </div>
              <span className="text-xs text-slate-400">Unresolved</span>
            </div>
            <h3 className="text-sm text-slate-400 mb-1">Open Incidents</h3>
            <p className="text-3xl font-bold text-white mb-2">8</p>
          </CardContent>
        </Card>
      </div>

      {/* Metrics Overview */}
      <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Metrics Overview</h3>
              <p className="text-sm text-slate-400">Real-time system metrics at a glance</p>
            </div>
            <Button 
              onClick={() => onNavigate('metrics')}
              variant="outline"
              size="sm"
              className="bg-transparent border-nebula-purple text-nebula-purple hover:bg-nebula-purple/10"
            >
              View All Metrics
              <ArrowRight className="size-4 ml-2" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {metricsOverview.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <Card 
                  key={index} 
                  className="bg-nebula-navy-dark border-nebula-navy-lighter hover:border-nebula-purple/30 transition-colors cursor-pointer"
                  onClick={() => onNavigate('metrics')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-10 h-10 rounded-lg ${metric.iconBg} flex items-center justify-center`}>
                        <Icon className={`size-5 ${metric.iconColor}`} />
                      </div>
                      <span className={`text-xs font-medium ${getMetricStatusColor(metric.status)}`}>
                        {metric.status === 'elevated' ? '↑' : '→'} {metric.status}
                      </span>
                    </div>
                    
                    <h4 className="text-sm text-slate-400 mb-2">{metric.label}</h4>
                    
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-2xl font-bold text-white">{metric.current}%</span>
                      <span className="text-xs text-slate-500">avg {metric.average}%</span>
                    </div>

                    {/* Mini Sparkline Chart */}
                    <div className="h-12">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={metric.data.map((value, i) => ({ value }))}>
                          <Bar 
                            dataKey="value" 
                            fill={metric.status === 'elevated' ? '#EAB308' : metric.iconColor.replace('text-', '#')} 
                            radius={[4, 4, 0, 0]}
                            opacity={0.6}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Incidents & Activity (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Open Incidents */}
          <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">Open Incidents</h3>
                  <p className="text-sm text-slate-400">Incidents requiring attention</p>
                </div>
                <Button 
                  onClick={() => onNavigate('incidents')}
                  variant="outline"
                  size="sm"
                  className="bg-transparent border-nebula-purple text-nebula-purple hover:bg-nebula-purple/10"
                >
                  View All
                </Button>
              </div>

              <div className="space-y-3">
                {openIncidents.map((incident) => (
                  <div 
                    key={incident.id}
                    className="p-4 bg-nebula-navy-dark rounded-lg border border-nebula-navy-lighter hover:border-nebula-purple/30 transition-all cursor-pointer"
                    onClick={() => onNavigate('incidents')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-slate-500">{incident.id}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getSeverityColor(incident.severity)}`}>
                            {incident.severity.toUpperCase()}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(incident.status)}`}>
                            {incident.status}
                          </span>
                          {incident.hasRecommendation && (
                            <span className="text-xs text-purple-400">💡</span>
                          )}
                        </div>
                        <p className="text-sm text-white font-medium mb-1">{incident.title}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span>Assigned: {incident.assignedTo}</span>
                          <span className="•"></span>
                          <span>Duration: {incident.duration}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Resources & Activity (1/3 width) */}
        <div className="space-y-6">
          {/* Top Affected Resources */}
          <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
            <CardContent className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">Top Affected Resources</h3>
                <p className="text-sm text-slate-400">Resources with most anomalies</p>
              </div>
              <div className="space-y-3">
                {topAffectedResources.map((resource, index) => (
                  <div key={index} className="p-3 bg-nebula-navy-dark rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white font-medium truncate">{resource.name}</span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <AlertTriangle className="size-3" />
                        {resource.anomalyCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="h-2 bg-nebula-navy rounded-full overflow-hidden flex-1 mr-3">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            resource.status === 'healthy' ? 'bg-green-500' :
                            resource.status === 'degraded' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${resource.health}%` }}
                        ></div>
                      </div>
                      <span className={`text-xs font-medium ${getHealthColor(resource.status)}`}>
                        {resource.health}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Anomaly Trend Graph - Full Width */}
      <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Anomaly Trend</h3>
              <p className="text-sm text-slate-400 mt-1">Anomalies detected over time</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={anomalyTrendData}>
              <defs>
                <linearGradient id="anomalyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis 
                dataKey="time" 
                stroke="#64748B"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#64748B"
                style={{ fontSize: '12px' }}
                label={{ value: 'Anomalies', angle: -90, position: 'insideLeft', style: { fill: '#64748B', fontSize: '12px' } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  border: '1px solid #1E293B',
                  borderRadius: '8px',
                  color: '#F1F5F9'
                }}
              />
              <Area
                type="monotone"
                dataKey="anomalies"
                stroke="#EF4444"
                strokeWidth={2}
                fill="url(#anomalyGradient)"
                name="Anomalies"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}