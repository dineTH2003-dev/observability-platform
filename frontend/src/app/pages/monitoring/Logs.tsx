import { useState, useEffect } from 'react';
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
import { logService } from '../../services/logService';
import { serviceService } from '../../services/serviceService';
import { hostService } from '../../services/hostService';
import { useSocket } from '../../context/SocketContext';

interface LogEntry {
  id: string | number;
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  service: string;
  host: string;
  message: string;
  source?: string;
  metadata?: Record<string, any>;
}

export function Logs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [hostFilter, setHostFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [servicesList, setServicesList] = useState<string[]>([]);
  const [hostsList, setHostsList] = useState<string[]>([]);

  // Load filter options (services and hosts) on mount
  useEffect(() => {
    async function loadFilterOptions() {
      try {
        const [allServices, allHosts] = await Promise.all([
          serviceService.getAll(),
          hostService.getAll(),
        ]);
        setServicesList(Array.from(new Set(allServices.map((s) => s.name))).sort());
        setHostsList(Array.from(new Set(allHosts.map((h) => h.hostname))).sort());
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    }
    loadFilterOptions();
  }, []);

  // Fetch logs whenever filters or search query changes
  useEffect(() => {
    let active = true;
    async function getLogs() {
      setLoading(true);
      try {
        const fetched = await logService.fetchLogs({
          level: levelFilter,
          service: serviceFilter,
          host: hostFilter,
          search: searchQuery,
        });
        if (active) {
          const mapped: LogEntry[] = fetched.map((l) => ({
            id: l.id,
            timestamp: new Date(l.timestamp).toLocaleString(),
            level: l.level as 'error' | 'warning' | 'info',
            service: l.service,
            host: l.host,
            message: l.message,
            metadata: l.metadata,
          }));
          setLogs(mapped);
        }
      } catch (err) {
        console.error('Failed to fetch logs:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    const timer = setTimeout(() => {
      getLogs();
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [levelFilter, serviceFilter, hostFilter, searchQuery]);

  // Real-time socket listener for incoming live log ingestion
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket) return;

    const handleLiveLog = () => {
      // Refresh log stream seamlessly when agent ingests logs
      logService
        .fetchLogs({
          level: levelFilter,
          service: serviceFilter,
          host: hostFilter,
          search: searchQuery,
        })
        .then((fetched) => {
          const mapped: LogEntry[] = fetched.map((l) => ({
            id: l.id,
            timestamp: new Date(l.timestamp).toLocaleString(),
            level: l.level as 'error' | 'warning' | 'info',
            service: l.service,
            host: l.host,
            message: l.message,
            metadata: l.metadata,
          }));
          setLogs(mapped);
        })
        .catch(() => {});
    };

    socket.on('live_log', handleLiveLog);
    return () => {
      socket.off('live_log', handleLiveLog);
    };
  }, [socket, levelFilter, serviceFilter, hostFilter, searchQuery]);

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

  const handleExportLogs = () => {
    if (logs.length === 0) return;
    const headers = ['Time', 'Level', 'Service', 'Host', 'Message'];
    const rows = logs.map((log) => [
      log.timestamp,
      log.level,
      log.service,
      log.host,
      log.message.replace(/"/g, '""'),
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => `"${e.join('","')}"`)].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nebula_logs_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Logs and Events</h1>
        <p className="text-slate-400 text-sm mt-1">Explore your log data and system events</p>
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
                  {servicesList.map((service) => (
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
                  {hostsList.map((host) => (
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
          {loading ? 'Fetching logs...' : `Showing ${logs.length} logs`}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportLogs}
          disabled={logs.length === 0 || loading}
          className="border-nebula-navy-lighter text-slate-300 hover:bg-nebula-navy-dark hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse border-b border-nebula-navy-lighter/30">
                      <td className="px-6 py-4"><div className="h-4 bg-slate-700/50 rounded w-24"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-700/50 rounded w-16"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-700/50 rounded w-20"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-700/50 rounded w-20"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-700/50 rounded w-80"></div></td>
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <FileText className="size-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">No logs found.</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr 
                      key={log.id} 
                      className="hover:bg-nebula-navy-dark transition-colors cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="px-6 py-4 text-slate-300 text-sm whitespace-nowrap">{log.timestamp}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded text-xs font-medium uppercase ${getLevelColor(log.level)}`}>
                          {log.level}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-white text-sm whitespace-nowrap">{log.service}</td>
                      <td className="px-6 py-4 text-slate-300 text-sm whitespace-nowrap">{log.host}</td>
                      <td className="px-6 py-4 text-white text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="line-clamp-2 break-all">{log.message}</span>
                          <span className="text-blue-400 hover:text-blue-300 text-xs shrink-0 font-medium">
                            View Details
                          </span>
                        </div>
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
                  <p className="text-sm text-white leading-relaxed break-all font-mono whitespace-pre-wrap">{selectedLog.message}</p>
                </CardContent>
              </Card>

              {/* Metadata */}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <Card className="bg-nebula-navy-dark border-nebula-navy-lighter">
                  <CardContent className="p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-white mb-3">Metadata</h3>
                    {Object.entries(selectedLog.metadata).map(([key, val]) => (
                      <div key={key}>
                        <p className="text-xs text-slate-400 mb-1">{key}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-white font-mono break-all">{JSON.stringify(val)}</p>
                          <button
                            onClick={() => copyToClipboard(JSON.stringify(val))}
                            className="ml-2 text-slate-400 hover:text-white flex-shrink-0"
                          >
                            {copiedField === JSON.stringify(val) ? (
                              <Check className="size-4 text-green-400" />
                            ) : (
                              <Copy className="size-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
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