import { useState } from 'react';
import { FileText, Search, Download, X, Copy, Check } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

interface LogEntry {
  id: number;
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  service: string;
  host: string;
  message: string;
  traceId?: string;
  requestId?: string;
  userId?: string;
  source?: string;
  container?: string;
  pod?: string;
  namespace?: string;
  statusCode?: number;
  duration?: number;
  tags?: string[];
  stackTrace?: string;
  metadata?: Record<string, any>;
}

export function Logs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [hostFilter, setHostFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const logs: LogEntry[] = [
    {
      id: 1,
      timestamp: '2025-01-16 21:12:43',
      level: 'error',
      service: 'snmp-agent',
      host: 'server-01',
      message: 'SNMP trap (SNMPv2-MIB::coldStart) reported from 10.89.0.19',
      traceId: 'trace-8f9e2d3c-1a4b-5e6f-7890-abcdef123456',
      requestId: 'req-abc123def456',
      source: '/var/log/snmp/agent.log',
      container: 'snmp-agent-container',
      pod: 'snmp-agent-78d9f8-xt5kp',
      namespace: 'monitoring',
      tags: ['snmp', 'trap', 'network'],
      stackTrace: 'SNMPTrapHandler.process(SNMPTrapHandler.java:145)\n    at SNMPAgent.handleTrap(SNMPAgent.java:89)\n    at SNMPService.run(SNMPService.java:234)',
      metadata: {
        'trap.oid': 'SNMPv2-MIB::coldStart',
        'source.ip': '10.89.0.19',
        'community': 'public'
      }
    },
    {
      id: 2,
      timestamp: '2025-01-16 21:12:41',
      level: 'warning',
      service: 'snmp-agent',
      host: 'server-02',
      message: 'SNMP trap (CISCO-SMI::ciscoMgmt) reported from 10.69.0.3',
      traceId: 'trace-9e8d7c6b-2a3b-4c5d-6789-fedcba987654',
      requestId: 'req-xyz789ghi012',
      source: '/var/log/snmp/agent.log',
      container: 'snmp-agent-container',
      pod: 'snmp-agent-78d9f8-xt5kp',
      namespace: 'monitoring',
      tags: ['snmp', 'cisco', 'network'],
      metadata: {
        'trap.oid': 'CISCO-SMI::ciscoMgmt',
        'source.ip': '10.69.0.3',
        'device.type': 'cisco-switch'
      }
    },
    {
      id: 3,
      timestamp: '2025-01-16 21:12:39',
      level: 'info',
      service: 'kube-controller',
      host: 'master-01',
      message: 'ClusterRoleBinding system:controller:token-cleaner updated',
      traceId: 'trace-1a2b3c4d-5e6f-7890-abcd-ef1234567890',
      requestId: 'req-k8s-update-001',
      source: '/var/log/kubernetes/controller.log',
      container: 'kube-controller-manager',
      pod: 'kube-controller-manager-master-01',
      namespace: 'kube-system',
      tags: ['kubernetes', 'rbac', 'controller'],
      metadata: {
        'resource.type': 'ClusterRoleBinding',
        'resource.name': 'system:controller:token-cleaner',
        'action': 'update'
      }
    },
    {
      id: 4,
      timestamp: '2025-01-16 21:12:35',
      level: 'error',
      service: 'payment-service',
      host: 'server-03',
      message: 'Database connection timeout after 30 seconds',
      traceId: 'trace-5f6e7d8c-9a0b-1c2d-3e4f-567890abcdef',
      requestId: 'req-payment-tx-9876',
      userId: 'user-45678',
      source: '/var/log/payment/service.log',
      container: 'payment-api',
      pod: 'payment-service-9d8f7-k2m9p',
      namespace: 'production',
      statusCode: 500,
      duration: 30245,
      tags: ['database', 'timeout', 'critical'],
      stackTrace: 'java.sql.SQLException: Connection timeout\n    at DatabasePool.getConnection(DatabasePool.java:156)\n    at PaymentService.processTransaction(PaymentService.java:89)\n    at PaymentController.handlePayment(PaymentController.java:45)',
      metadata: {
        'db.host': 'postgres-primary.db.svc.cluster.local',
        'db.port': '5432',
        'db.name': 'payments',
        'connection.pool.size': '50',
        'active.connections': '50'
      }
    },
    {
      id: 5,
      timestamp: '2025-01-16 21:12:30',
      level: 'warning',
      service: 'kube-controller',
      host: 'master-01',
      message: 'Pod scheduling delayed due to resource constraints',
      traceId: 'trace-7g8h9i0j-1k2l-3m4n-5o6p-7q8r9s0t1u2v',
      requestId: 'req-schedule-pod-234',
      source: '/var/log/kubernetes/scheduler.log',
      container: 'kube-scheduler',
      pod: 'kube-scheduler-master-01',
      namespace: 'kube-system',
      duration: 5420,
      tags: ['kubernetes', 'scheduling', 'resources'],
      metadata: {
        'pod.name': 'analytics-worker-5f6g7h8',
        'pod.namespace': 'analytics',
        'required.cpu': '2000m',
        'required.memory': '4Gi',
        'available.nodes': '3'
      }
    },
    {
      id: 6,
      timestamp: '2025-01-16 21:12:25',
      level: 'info',
      service: 'payment-service',
      host: 'server-01',
      message: 'Successfully processed 1250 transactions',
      traceId: 'trace-2b3c4d5e-6f7g-8h9i-0j1k-2l3m4n5o6p7q',
      requestId: 'req-batch-process-445',
      source: '/var/log/payment/batch.log',
      container: 'payment-batch-processor',
      pod: 'payment-batch-7h8i9-p3q4r',
      namespace: 'production',
      statusCode: 200,
      duration: 12350,
      tags: ['batch', 'success', 'transactions'],
      metadata: {
        'batch.id': 'batch-2025-01-16-001',
        'transactions.total': '1250',
        'transactions.successful': '1248',
        'transactions.failed': '2',
        'total.amount': '$125,340.50'
      }
    },
  ];

  // Get unique services and hosts for filter dropdowns
  const uniqueServices = Array.from(new Set(logs.map(log => log.service))).sort();
  const uniqueHosts = Array.from(new Set(logs.map(log => log.host))).sort();

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.host.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
    const matchesService = serviceFilter === 'all' || log.service === serviceFilter;
    const matchesHost = hostFilter === 'all' || log.host === hostFilter;
    return matchesSearch && matchesLevel && matchesService && matchesHost;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'warning':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'info':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(text);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Logs and Events</h1>
        <p className="text-slate-400 text-sm mt-1">Explore your log data and Kubernetes events</p>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Search */}
        <div className="lg:col-span-2">
          <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-nebula-navy-dark border-nebula-navy-lighter text-white placeholder:text-slate-500"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Level Filter */}
        <div>
          <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
            <CardContent className="p-4">
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="bg-nebula-navy-dark border-nebula-navy-lighter text-white">
                  <SelectValue placeholder="Filter by level" />
                </SelectTrigger>
                <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Service Filter */}
        <div>
          <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
            <CardContent className="p-4">
              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger className="bg-nebula-navy-dark border-nebula-navy-lighter text-white">
                  <SelectValue placeholder="Filter by service" />
                </SelectTrigger>
                <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
                  <SelectItem value="all">All Services</SelectItem>
                  {uniqueServices.map((service) => (
                    <SelectItem key={service} value={service}>
                      {service}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Host Filter */}
        <div>
          <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
            <CardContent className="p-4">
              <Select value={hostFilter} onValueChange={setHostFilter}>
                <SelectTrigger className="bg-nebula-navy-dark border-nebula-navy-lighter text-white">
                  <SelectValue placeholder="Filter by host" />
                </SelectTrigger>
                <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
                  <SelectItem value="all">All Hosts</SelectItem>
                  {uniqueHosts.map((host) => (
                    <SelectItem key={host} value={host}>
                      {host}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-sm">
          Showing {filteredLogs.length} of {logs.length} logs
        </p>
        <Button
          variant="outline"
          size="sm"
          className="border-nebula-navy-lighter text-slate-300 hover:bg-nebula-navy-dark hover:text-white"
        >
          <Download className="size-4 mr-2" />
          Export Logs
        </Button>
      </div>

      {/* Logs Table */}
      <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-nebula-navy-dark border-b border-nebula-navy-lighter">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Host
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Message
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nebula-navy-lighter">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <FileText className="size-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">No logs found.</p>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr 
                      key={log.id} 
                      className="hover:bg-nebula-navy-dark transition-colors cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="px-6 py-4 text-slate-300 text-sm">{log.timestamp}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded text-xs font-medium uppercase ${getLevelColor(log.level)}`}>
                          {log.level}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-white text-sm">{log.service}</td>
                      <td className="px-6 py-4 text-slate-300 text-sm">{log.host}</td>
                      <td className="px-6 py-4 text-white text-sm">
                        {log.message}
                        <button className="ml-2 text-blue-400 hover:text-blue-300 text-xs">
                          Click to view details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Log Details Side Panel */}
      {selectedLog && (
        <div className="fixed top-0 right-0 h-full w-[500px] bg-nebula-navy-light border-l border-nebula-navy-lighter shadow-2xl z-50 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Log Details</h2>
              <button 
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Basic Info */}
              <Card className="bg-nebula-navy-dark border-nebula-navy-lighter">
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-white mb-3">Basic Information</h3>
                  
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Timestamp</p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-white font-mono">{selectedLog.timestamp}</p>
                      <button
                        onClick={() => copyToClipboard(selectedLog.timestamp)}
                        className="text-slate-400 hover:text-white"
                      >
                        {copiedField === selectedLog.timestamp ? (
                          <Check className="size-4 text-green-400" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400 mb-1">Level</p>
                    <span className={`inline-block px-3 py-1 rounded text-xs font-medium uppercase ${getLevelColor(selectedLog.level)}`}>
                      {selectedLog.level}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400 mb-1">Service</p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-white font-mono">{selectedLog.service}</p>
                      <button
                        onClick={() => copyToClipboard(selectedLog.service)}
                        className="text-slate-400 hover:text-white"
                      >
                        {copiedField === selectedLog.service ? (
                          <Check className="size-4 text-green-400" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400 mb-1">Host</p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-white font-mono">{selectedLog.host}</p>
                      <button
                        onClick={() => copyToClipboard(selectedLog.host)}
                        className="text-slate-400 hover:text-white"
                      >
                        {copiedField === selectedLog.host ? (
                          <Check className="size-4 text-green-400" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Message */}
              <Card className="bg-nebula-navy-dark border-nebula-navy-lighter">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-xs text-slate-400">Message</p>
                    <button
                      onClick={() => copyToClipboard(selectedLog.message)}
                      className="text-slate-400 hover:text-white"
                    >
                      {copiedField === selectedLog.message ? (
                        <Check className="size-4 text-green-400" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-white leading-relaxed">{selectedLog.message}</p>
                </CardContent>
              </Card>

              {/* Source */}
              {selectedLog.source && (
                <Card className="bg-nebula-navy-dark border-nebula-navy-lighter">
                  <CardContent className="p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-white mb-3">Source</h3>
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-white font-mono break-all">{selectedLog.source}</p>
                        <button
                          onClick={() => copyToClipboard(selectedLog.source!)}
                          className="ml-2 text-slate-400 hover:text-white flex-shrink-0"
                        >
                          {copiedField === selectedLog.source ? (
                            <Check className="size-4 text-green-400" />
                          ) : (
                            <Copy className="size-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Source IP from Metadata */}
              {selectedLog.metadata?.['source.ip'] && (
                <Card className="bg-nebula-navy-dark border-nebula-navy-lighter">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-xs text-slate-400">Source IP</p>
                      <button
                        onClick={() => copyToClipboard(selectedLog.metadata!['source.ip'])}
                        className="text-slate-400 hover:text-white"
                      >
                        {copiedField === selectedLog.metadata?.['source.ip'] ? (
                          <Check className="size-4 text-green-400" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-sm text-white font-mono">{selectedLog.metadata['source.ip']}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}