import { useState, useEffect, useCallback } from 'react';
import {
  Wrench, Search, Activity, CheckCircle, AlertCircle,
  XCircle, ExternalLink, Trash2, Settings, RefreshCw, ServerCrash,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../components/ui/dialog';
import { LogAnalysesConfigModal } from '../../components/ui/LogAnalysesConfigModal';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '../../components/ui/tooltip';
import { serviceService, type Service as ApiService } from '../../services/serviceService';
import { applicationService } from '../../services/applicationService';
import type { Application } from '../../types/application';

// Types
interface Service {
  id: number;
  name: string;
  technology: string;
  status: string;      // RUNNING | STOPPED | UNKNOWN
  applicationId: number | null;
  application: string;
  serverName: string;
  logsAnalysesActive: boolean;
  logPath: string;
  updatedAt: string;
}

interface ServicesPageProps {
  onNavigate?: (page: string, serviceId?: number) => void;
}

// Helpers
function mapApiService(s: ApiService): Service {
  return {
    id: s.service_id,
    name: s.name,
    technology: s.technology ?? 'Unknown',
    status: s.status,
    applicationId: s.application_id,
    application: s.application_name ?? '—',
    serverName: s.server_name ?? '—',
    logsAnalysesActive: s.logs_analyses_active ?? false,
    logPath: s.log_path ?? '',
    updatedAt: s.updated_at,
  };
}

// RUNNING => healthy (green)
// STOPPED => critical (red) <= service went down
// UNKNOWN => unknown  (slate) <= not yet discovered
function toHealth(status: string): 'healthy' | 'warning' | 'critical' | 'unknown' {
  switch (status?.toUpperCase()) {
    case 'RUNNING': return 'healthy';
    case 'STOPPED': return 'critical';
    default: return 'unknown';
  }
}

function HealthIcon({ status }: { status: string }) {
  const h = toHealth(status);
  if (h === 'healthy') return <CheckCircle className="size-4 text-green-400" />;
  if (h === 'critical') return <XCircle className="size-4 text-red-400" />;
  if (h === 'warning') return <AlertCircle className="size-4 text-yellow-400" />;
  return <Activity className="size-4 text-slate-400" />;
}

function healthBadgeClass(status: string): string {
  const h = toHealth(status);
  if (h === 'healthy') return 'bg-green-500/10  text-green-400';
  if (h === 'critical') return 'bg-red-500/10    text-red-400';
  if (h === 'warning') return 'bg-yellow-500/10 text-yellow-400';
  return 'bg-slate-500/10 text-slate-400';
}

function techBadgeClass(tech: string): string {
  const map: Record<string, string> = {
    'Java': 'bg-orange-500/10 text-orange-400',
    'Node.js': 'bg-green-500/10  text-green-400',
    'Go': 'bg-cyan-500/10   text-cyan-400',
    'Python': 'bg-blue-500/10   text-blue-400',
    'Nginx': 'bg-emerald-500/10 text-emerald-400',
    'PostgreSQL': 'bg-sky-500/10    text-sky-400',
    'Redis': 'bg-red-500/10    text-red-400',
    '.NET': 'bg-purple-500/10 text-purple-400',
    'MySQL': 'bg-orange-500/10 text-orange-400',
  };
  return map[tech] || 'bg-slate-500/10 text-slate-400';
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-nebula-navy-lighter">
      {[44, 24, 36, 20, 28, 20].map((w, i) => (
        <td key={i} className="p-4">
          <div className="h-4 rounded bg-nebula-navy-lighter" style={{ width: `${w * 4}px` }} />
        </td>
      ))}
    </tr>
  );
}

// Main Component
export function Services({ onNavigate }: ServicesPageProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [deleteService, setDeleteService] = useState<Service | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setLoadError(null);
    try {
      const [apiServices, appsRes] = await Promise.all([
        serviceService.getAll(),
        applicationService.getAll(),
      ]);
      setServices(apiServices.map(mapApiService));
      setApplications((appsRes as any).data ?? appsRes);
    } catch {
      setLoadError('Failed to load services. Please try again.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-poll every 30s - picks up status changes (RUNNING => STOPPED => RUNNING)
  // without user action when services go down or come back up.
  useEffect(() => {
    const t = setInterval(() => loadData(true), 30_000);
    return () => clearInterval(t);
  }, [loadData]);

  const handleRefresh = () => { loadData(); toast.info('Refreshing services…'); };

  // Filtering
  const filtered = services.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.technology.toLowerCase().includes(q) ||
      s.application.toLowerCase().includes(q) ||
      s.serverName.toLowerCase().includes(q)
    );
  });

  // Handlers
  const handleUpdateApplication = async (serviceId: number, applicationId: string) => {
    const appId = Number(applicationId);
    const app = applications.find((a) => a.application_id === appId);
    try {
      await serviceService.updateApplication(serviceId, appId);
      setServices((prev) => prev.map((s) =>
        s.id === serviceId ? { ...s, applicationId: appId, application: app?.name ?? '—' } : s,
      ));
      toast.success('Application updated');
    } catch {
      toast.error('Failed to update application');
    }
  };

  const handleSaveLogConfig = async (logPath: string, enabled: boolean) => {
    if (!selectedService) return;
    try {
      await serviceService.saveLogConfig(selectedService.id, {
        log_path: logPath, is_enabled: enabled,
      });
      setServices((prev) => prev.map((s) =>
        s.id === selectedService.id
          ? { ...s, logPath, logsAnalysesActive: enabled }
          : s,
      ));
      toast.success('Log config saved');
    } catch {
      toast.error('Failed to save log config');
    }
  };

  const handleDelete = async () => {
    if (!deleteService) return;
    setDeleting(true);
    try {
      await serviceService.delete(deleteService.id);
      setServices((prev) => prev.filter((s) => s.id !== deleteService.id));
      toast.success('Service deleted', { description: `${deleteService.name} removed.` });
      setIsDeleteOpen(false);
      setDeleteService(null);
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  // Render
  return (
    <TooltipProvider>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Services</h1>
            <p className="text-slate-400 text-sm mt-1">
              Processes discovered by the OneAgent - health updates automatically
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={loading}
            className="text-slate-400 hover:text-white hover:bg-nebula-navy-lighter">
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Error banner */}
        {loadError && (
          <Card className="bg-red-500/10 border-red-500/30">
            <CardContent className="p-4 flex items-center gap-3">
              <ServerCrash className="size-5 text-red-400 shrink-0" />
              <p className="text-red-400 text-sm flex-1">{loadError}</p>
              <Button variant="ghost" size="sm" onClick={handleRefresh}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                placeholder="Search by name, technology, application, server…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-nebula-navy-dark border-nebula-navy-lighter text-white placeholder:text-slate-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-nebula-navy-lighter">
                    {['Service Name', 'Technology', 'Server', 'Application', 'Health', 'Logs Analyses', 'Actions'].map((h) => (
                      <th key={h} className="text-left p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center">
                        <Wrench className="size-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400 font-medium">No services found.</p>
                        <p className="text-slate-500 text-sm mt-1">
                          {searchQuery
                            ? 'Try adjusting your search.'
                            : 'Services are auto-discovered once the OneAgent is installed on a host.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((service, index) => (
                      <tr
                        key={service.id}
                        className={`border-b border-nebula-navy-lighter hover:bg-nebula-navy-dark transition-colors ${index === filtered.length - 1 ? 'border-b-0' : ''
                          }`}
                      >
                        {/* Name */}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-nebula-cyan/10 flex items-center justify-center flex-shrink-0">
                              <Wrench className="size-5 text-nebula-cyan" />
                            </div>
                            <div>
                              <p className="text-white font-medium">{service.name}</p>
                              {service.status === 'STOPPED' && (
                                <p className="text-xs text-red-400 mt-0.5">Process not running</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Technology */}
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${techBadgeClass(service.technology)}`}>
                            {service.technology}
                          </span>
                        </td>

                        {/* Server */}
                        <td className="p-4 text-slate-400 text-sm">
                          {service.serverName}
                        </td>

                        {/* Application dropdown */}
                        <td className="p-4">
                          <Select
                            value={service.applicationId ? String(service.applicationId) : ''}
                            onValueChange={(val) => handleUpdateApplication(service.id, val)}
                          >
                            <SelectTrigger className="w-[180px] bg-nebula-navy-dark border-nebula-navy-lighter text-white">
                              <SelectValue placeholder="Assign…" />
                            </SelectTrigger>
                            <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
                              {applications.map((app) => (
                                <SelectItem key={app.application_id} value={String(app.application_id)}>
                                  {app.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>

                        {/* Health — derived from RUNNING / STOPPED / UNKNOWN */}
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <HealthIcon status={service.status} />
                            <span className={`px-2 py-1 rounded text-xs font-medium ${healthBadgeClass(service.status)}`}>
                              {service.status}
                            </span>
                          </div>
                        </td>

                        {/* Log config */}
                        <td className="p-4 w-[220px]">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-2.5 h-2.5 rounded-full ${service.logsAnalysesActive ? 'bg-green-500' : 'bg-slate-500'}`} />
                              <span className={`text-sm font-medium ${service.logsAnalysesActive ? 'text-green-400' : 'text-slate-400'}`}>
                                {service.logsAnalysesActive ? 'Enabled' : 'Not Configured'}
                              </span>
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => { setSelectedService(service); setConfigModalOpen(true); }}
                                  className={`p-1.5 rounded-md border transition-all flex-shrink-0 ${service.logsAnalysesActive
                                      ? 'text-green-400 border-green-500/30 bg-green-500/5 hover:bg-green-500/10'
                                      : 'text-slate-400 border-slate-600/30 bg-slate-600/5 hover:bg-slate-600/10'
                                    }`}
                                >
                                  {service.logsAnalysesActive ? <Settings className="size-3.5" /> : <Wrench className="size-3.5" />}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-nebula-navy-dark border-nebula-navy-lighter text-white" sideOffset={5}>
                                <p>{service.logsAnalysesActive ? 'Manage Log Config' : 'Configure Log Analysis'}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm"
                              className="text-nebula-blue hover:text-nebula-purple hover:bg-nebula-navy-lighter"
                              onClick={() => onNavigate?.('service-metrics', service.id)}>
                              <ExternalLink className="size-4 mr-1" />
                              Metrics
                            </Button>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon"
                                  onClick={() => { setDeleteService(service); setIsDeleteOpen(true); }}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                                  <Trash2 className="size-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-nebula-navy-dark border-nebula-navy-lighter text-white" sideOffset={5}>
                                <p>Delete</p>
                              </TooltipContent>
                            </Tooltip>
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

        {/* Log config modal */}
        <LogAnalysesConfigModal
          isOpen={configModalOpen}
          onClose={() => setConfigModalOpen(false)}
          serviceName={selectedService?.name || ''}
          currentLogPath={selectedService?.logPath}
          currentEnabled={selectedService?.logsAnalysesActive || false}
          onSave={handleSaveLogConfig}
        />

        {/* Delete dialog */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-400 flex items-center gap-2">
                <Trash2 className="size-4" /> Delete Service
              </DialogTitle>
            </DialogHeader>
            <p className="text-slate-300 text-sm">
              Are you sure you want to delete{' '}
              <span className="text-white font-semibold">{deleteService?.name}</span>?{' '}
              It will reappear on the next discovery cycle if still running.
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={deleting}
                className="bg-transparent border-nebula-navy-lighter text-slate-300 hover:bg-nebula-navy-dark hover:text-white">
                Cancel
              </Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white min-w-[80px]"
                onClick={handleDelete} disabled={deleting}>
                {deleting ? <RefreshCw className="size-4 animate-spin" /> : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
