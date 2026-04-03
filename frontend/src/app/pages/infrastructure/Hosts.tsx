"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Server, Search, Plus, CheckCircle, Download, Copy, Trash2,
  AlertTriangle, ChevronLeft, ChevronRight, RefreshCw, ServerCrash,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '../../components/ui/tooltip';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogFooter,
} from '../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { hostService } from '../../services/hostService';

// Constants
const STATUS_TABS = ['ALL', 'HEALTHY', 'WARNING', 'CRITICAL', 'UNKNOWN'] as const;
type StatusTab = typeof STATUS_TABS[number];

const PAGE_SIZE_OPTIONS = [10, 25, 50];

// Background poll interval - picks up agent_status / server_status
const POLL_INTERVAL_MS = 30_000;

const EMPTY_FORM = {
  hostname: '',
  ip_address: '',
  username: '',
  ssh_port: '22',
  os: '',
  environment: '',
};

// Types
interface Host {
  id: number;
  name: string;
  ip: string;
  env: string;
  health: string;
  agent: string;
  ssh_port?: number;
  username?: string;
  lastDiscoveredAt?: string;
}

interface HostForm {
  hostname: string;
  ip_address: string;
  username: string;
  ssh_port: string;
  os: string;
  environment: string;
}

interface FormErrors {
  hostname?: string;
  ip_address?: string;
  username?: string;
  environment?: string;
}

// Helpers
function safeStr(val: string | null | undefined): string {
  return val ?? '';
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** "Just now" / "3 min ago" / "2 h ago" */
function formatLastSeen(iso: string | undefined): string {
  if (!iso) return '';
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'Just now';
  if (secs < 3600) return `${Math.floor(secs / 60)} min ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)} h ago`;
  return `${Math.floor(secs / 86400)} d ago`;
}

function tabRingClass(tab: StatusTab, active: StatusTab): string {
  if (tab !== active) return 'text-slate-400 hover:text-white border-transparent';
  switch (tab) {
    case 'HEALTHY': return 'text-green-400  border-green-400';
    case 'WARNING': return 'text-yellow-400 border-yellow-400';
    case 'CRITICAL': return 'text-red-400    border-red-400';
    default: return 'text-white       border-nebula-blue';
  }
}

function getHealthBadgeStyle(health: string): string {
  switch (health?.toUpperCase()) {
    case 'HEALTHY': return 'bg-green-500/10  text-green-400  border-green-500/20';
    case 'WARNING': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    case 'CRITICAL': return 'bg-red-500/10    text-red-400    border-red-500/20';
    default: return 'bg-slate-500/10  text-slate-400  border-slate-500/20';
  }
}

function getAgentBadgeStyle(agent: string): string {
  switch (agent?.toUpperCase()) {
    case 'ACTIVE': return 'bg-green-500/10 text-green-400 border-green-500/20';
    case 'ERROR': return 'bg-red-500/10   text-red-400   border-red-500/20';
    default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  }
}

function getAgentTooltip(agent: string): string {
  switch (agent) {
    case 'INACTIVE': return 'Installation Pending - click to download installer';
    case 'ACTIVE': return 'Agent Active';
    case 'ERROR': return 'Agent Installation Failed';
    default: return agent;
  }
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[40, 28, 20, 16, 24].map((w, i) => (
        <td key={i} className="px-6 py-4">
          <div className={`h-4 rounded bg-nebula-navy-lighter w-${w}`} />
        </td>
      ))}
    </tr>
  );
}

// Main Component
export function Hosts() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [rawSearch, setRawSearch] = useState('');
  const [activeTab, setActiveTab] = useState<StatusTab>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isInstallDialogOpen, setIsInstallDialogOpen] = useState(false);
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);

  const [formData, setFormData] = useState<HostForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const [deleteHost, setDeleteHost] = useState<Host | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const search = useDebounce(rawSearch, 250);

  // Data loading
  const loadHosts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setLoadError(null);
    try {
      const response = await hostService.getAll();
      const mapped: Host[] = response.map((h: any) => ({
        id: h.server_id,
        name: h.hostname,
        ip: h.ip_address,
        env: h.environment,
        health: h.server_status,   // HEALTHY | WARNING | CRITICAL | UNKNOWN
        agent: h.agent_status,    // ACTIVE | INACTIVE | ERROR
        ssh_port: h.ssh_port,
        username: h.username,
        lastDiscoveredAt: h.last_discovered_at ?? undefined,
      }));
      setHosts(mapped);
    } catch {
      setLoadError('Failed to load hosts. Please try again.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { loadHosts(); }, [loadHosts]);

  // Auto-poll every 30s agent heartbeats & server_status
  useEffect(() => {
    const timer = setInterval(() => loadHosts(true), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadHosts]);

  useEffect(() => { setCurrentPage(1); }, [search, activeTab, pageSize]);

  const handleRefresh = () => {
    loadHosts();
    toast.info('Refreshing hosts…');
  };

  // Derived data
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: hosts.length };
    hosts.forEach((h) => {
      const key = h.health?.toUpperCase() || 'UNKNOWN';
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  }, [hosts]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return hosts.filter((host) => {
      const matchesStatus = activeTab === 'ALL' || host.health?.toUpperCase() === activeTab;
      if (!matchesStatus) return false;
      if (!q) return true;
      return (
        safeStr(host.name).toLowerCase().includes(q) ||
        safeStr(host.ip).includes(q) ||
        safeStr(host.env).toLowerCase().includes(q)
      );
    });
  }, [hosts, search, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Form handling
  const resetForm = () => { setFormData(EMPTY_FORM); setFormErrors({}); setSubmitting(false); };
  const handleDialogOpenChange = (open: boolean) => { setIsDialogOpen(open); if (!open) resetForm(); };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    if (!formData.hostname.trim()) errors.hostname = 'Host Name is required.';
    if (!formData.ip_address.trim()) errors.ip_address = 'IP Address is required.';
    if (!formData.username.trim()) errors.username = 'Username is required.';
    if (!formData.environment.trim()) errors.environment = 'Environment is required.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Register new host
  const handleRegisterHost = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      await hostService.register({
        hostname: formData.hostname.trim(),
        ip_address: formData.ip_address.trim(),
        username: formData.username.trim(),
        environment: formData.environment,
        os: formData.os || 'linux',
        ssh_port: parseInt(formData.ssh_port || '22'),
      });
      await loadHosts(true);
      setIsDialogOpen(false);
      toast.success('Host registered', {
        description: `${formData.hostname.trim()} is now being monitored.`,
      });
    } catch {
      toast.error('Registration failed', { description: 'Something went wrong. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRegister = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  // Delete host
  const handleDeleteHost = async () => {
    if (!deleteHost) return;
    setDeleting(true);
    try {
      await hostService.delete(deleteHost.id);
      setHosts((prev) => prev.filter((h) => h.id !== deleteHost.id));
      toast.success('Host deleted', { description: `${deleteHost.name} removed.` });
      setIsDeleteOpen(false);
      setDeleteHost(null);
    } catch {
      toast.error('Delete failed', { description: 'Something went wrong. Please try again.' });
    } finally {
      setDeleting(false);
    }
  };

  // Agent installer
  const handleInstallAgent = (host: Host) => { setSelectedHost(host); setIsInstallDialogOpen(true); };

  const handleConfirmDownloadInstaller = async () => {
    if (!selectedHost) return;
    try {
      const blob = await hostService.downloadInstaller(selectedHost.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `oneagent-install-${selectedHost.name}.sh`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Installer downloaded');
      setIsInstallDialogOpen(false);
    } catch {
      toast.error('Failed to download installer');
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  // Render

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Hosts</h1>
          <p className="text-slate-400 text-sm mt-1">
            Monitor infrastructure health and connected agents.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh"
            className="text-slate-400 hover:text-white hover:bg-nebula-navy-lighter"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-nebula-purple to-nebula-blue hover:from-nebula-purple-dark hover:to-nebula-blue text-white">
                <Plus className="size-4 mr-2" />
                Register Host
              </Button>
            </DialogTrigger>

            <DialogContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white max-w-md">
              <DialogHeader>
                <DialogTitle>Register New Host</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-1">
                  <Label htmlFor="host-name" className="text-slate-300">
                    Host Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="host-name"
                    value={formData.hostname}
                    onChange={(e) => {
                      setFormData((p) => ({ ...p, hostname: e.target.value }));
                      if (formErrors.hostname) setFormErrors((p) => ({ ...p, hostname: undefined }));
                    }}
                    className={`bg-nebula-navy-dark border text-white placeholder:text-slate-600 ${formErrors.hostname ? 'border-red-500 focus-visible:ring-red-500' : 'border-nebula-navy-lighter'
                      }`}
                  />
                  {formErrors.hostname && <p className="text-xs text-red-400 mt-1">{formErrors.hostname}</p>}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="ip-address" className="text-slate-300">
                    IP Address <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="ip-address"
                    value={formData.ip_address}
                    onChange={(e) => {
                      setFormData((p) => ({ ...p, ip_address: e.target.value }));
                      if (formErrors.ip_address) setFormErrors((p) => ({ ...p, ip_address: undefined }));
                    }}
                    className={`bg-nebula-navy-dark border text-white placeholder:text-slate-600 ${formErrors.ip_address ? 'border-red-500 focus-visible:ring-red-500' : 'border-nebula-navy-lighter'
                      }`}
                  />
                  {formErrors.ip_address && <p className="text-xs text-red-400 mt-1">{formErrors.ip_address}</p>}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="ssh-username" className="text-slate-300">
                    SSH Username <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="ssh-username"
                    value={formData.username}
                    onChange={(e) => {
                      setFormData((p) => ({ ...p, username: e.target.value }));
                      if (formErrors.username) setFormErrors((p) => ({ ...p, username: undefined }));
                    }}
                    className={`bg-nebula-navy-dark border text-white placeholder:text-slate-600 ${formErrors.username ? 'border-red-500 focus-visible:ring-red-500' : 'border-nebula-navy-lighter'
                      }`}
                  />
                  {formErrors.username && <p className="text-xs text-red-400 mt-1">{formErrors.username}</p>}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="os-type" className="text-slate-300">OS Type</Label>
                  <Select value={formData.os} onValueChange={(v) => setFormData((p) => ({ ...p, os: v }))}>
                    <SelectTrigger className="bg-nebula-navy-dark border-nebula-navy-lighter text-white">
                      <SelectValue placeholder="Select OS" />
                    </SelectTrigger>
                    <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
                      <SelectItem value="linux">Linux</SelectItem>
                      <SelectItem value="windows">Windows</SelectItem>
                      <SelectItem value="macos">macOS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="environment" className="text-slate-300">
                    Environment <span className="text-red-400">*</span>
                  </Label>
                  <Select
                    value={formData.environment}
                    onValueChange={(v) => {
                      setFormData((p) => ({ ...p, environment: v }));
                      if (formErrors.environment) setFormErrors((p) => ({ ...p, environment: undefined }));
                    }}
                  >
                    <SelectTrigger className={`bg-nebula-navy-dark border text-white ${formErrors.environment ? 'border-red-500' : 'border-nebula-navy-lighter'
                      }`}>
                      <SelectValue placeholder="Select environment" />
                    </SelectTrigger>
                    <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
                      <SelectItem value="production">Production</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="development">Development</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.environment && <p className="text-xs text-red-400 mt-1">{formErrors.environment}</p>}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="ssh-port" className="text-slate-300">SSH Port</Label>
                  <Input
                    id="ssh-port"
                    value={formData.ssh_port}
                    onChange={(e) => setFormData((p) => ({ ...p, ssh_port: e.target.value }))}
                    placeholder="22"
                    className="bg-nebula-navy-dark border-nebula-navy-lighter text-white placeholder:text-slate-600"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancelRegister}
                  disabled={submitting}
                  className="bg-transparent border-nebula-navy-lighter text-slate-300 hover:bg-nebula-navy-dark hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRegisterHost}
                  disabled={submitting}
                  className="bg-gradient-to-r from-nebula-purple to-nebula-blue hover:from-nebula-purple-dark hover:to-nebula-blue text-white min-w-[120px]"
                >
                  {submitting ? <RefreshCw className="size-4 animate-spin" /> : 'Register Host'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Error */}
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
              placeholder="Search by hostname, IP, environment…"
              value={rawSearch}
              onChange={(e) => setRawSearch(e.target.value)}
              className="pl-10 bg-nebula-navy-dark border-nebula-navy-lighter text-white placeholder:text-slate-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Status tabs */}
      <div className="flex items-center gap-1 border-b border-nebula-navy-lighter">
        {STATUS_TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tabRingClass(tab, activeTab)}`}>
            {tab}
            <span className={`ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold ${tab === activeTab ? 'bg-white/10 text-white' : 'bg-nebula-navy-lighter text-slate-500'}`}>
              {statusCounts[tab] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
        <CardContent className="p-0">
          <TooltipProvider>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-nebula-navy-dark border-b border-nebula-navy-lighter">
                  <tr>
                    {['HOST', 'IP', 'ENV', 'HEALTH', 'AGENT'].map((h) => (
                      <th key={h} className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-nebula-navy-lighter">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center">
                        <Server className="size-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400 font-medium">No hosts found</p>
                        <p className="text-slate-500 text-sm mt-1">
                          {rawSearch || activeTab !== 'ALL'
                            ? 'Try adjusting your search or filters.'
                            : 'Register your first host to get started.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((host) => (
                      <tr key={host.id} className="hover:bg-nebula-navy-dark transition-colors">
                        <td className="px-6 py-4 text-white font-medium">{host.name}</td>
                        <td className="px-6 py-4 text-slate-300 font-mono text-sm">{host.ip}</td>
                        <td className="px-6 py-4 text-slate-300">{host.env}</td>

                        {/* server_status - updated by backend when agent sends metrics */}
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getHealthBadgeStyle(host.health)}`}>
                            {host.health}
                          </span>
                        </td>

                        {/* agent_status - updated by backend on heartbeat */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => {
                                    if (host.agent !== 'ACTIVE' && host.agent !== 'ERROR') {
                                      handleInstallAgent(host);
                                    }
                                  }}
                                  disabled={host.agent === 'ACTIVE' || host.agent === 'ERROR'}
                                  aria-label={getAgentTooltip(host.agent)}
                                  className={`transition-colors ${host.agent === 'ACTIVE' || host.agent === 'ERROR'
                                    ? 'cursor-default'
                                    : 'text-slate-400 hover:text-nebula-purple cursor-pointer'
                                    }`}
                                >
                                  {host.agent === 'ACTIVE' ? <CheckCircle className="size-4 text-green-400" /> :
                                    host.agent === 'ERROR' ? <AlertTriangle className="size-4 text-red-400" /> :
                                      <Download className="size-4" />}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-nebula-navy-dark border-nebula-navy-lighter text-white" sideOffset={5}>
                                <p>{getAgentTooltip(host.agent)}</p>
                              </TooltipContent>
                            </Tooltip>

                            <div className="flex flex-col gap-0.5">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getAgentBadgeStyle(host.agent)}`}>
                                {host.agent}
                              </span>
                              {/* Last heartbeat time - only shown when ACTIVE */}
                              {host.agent === 'ACTIVE' && host.lastDiscoveredAt && (
                                <span className="text-xs text-slate-500 pl-1">
                                  {formatLastSeen(host.lastDiscoveredAt)}
                                </span>
                              )}
                            </div>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => { setDeleteHost(host); setIsDeleteOpen(true); }}
                                  aria-label="Delete host"
                                  className="text-red-400 hover:text-red-300 transition-colors ml-auto"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-nebula-navy-dark border-nebula-navy-lighter text-white" sideOffset={5}>
                                <p>Delete Host</p>
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
          </TooltipProvider>

          {/* Pagination */}
          {!loading && filtered.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-nebula-navy-lighter">
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <span>
                  {`${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)}`}
                  {' '}of {filtered.length}
                </span>
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger className="w-[100px] bg-nebula-navy-dark border border-nebula-navy-lighter text-slate-300 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="text-slate-400 hover:text-white hover:bg-nebula-navy-lighter disabled:opacity-30">
                  <ChevronLeft className="size-4" />
                </Button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('…');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === '…' ? (
                      <span key={`e-${i}`} className="px-2 text-slate-500 text-sm">…</span>
                    ) : (
                      <Button key={p} variant="ghost" size="sm"
                        onClick={() => setCurrentPage(p as number)}
                        className={`min-w-[32px] text-sm ${currentPage === p
                          ? 'bg-nebula-blue/20 text-nebula-blue'
                          : 'text-slate-400 hover:text-white hover:bg-nebula-navy-lighter'}`}>
                        {p}
                      </Button>
                    )
                  )}

                <Button variant="ghost" size="icon" disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="text-slate-400 hover:text-white hover:bg-nebula-navy-lighter disabled:opacity-30">
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Install agent dialog */}
      <Dialog open={isInstallDialogOpen} onOpenChange={setIsInstallDialogOpen}>
        <DialogContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Install OneAgent on {selectedHost?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <p className="text-slate-400 text-sm">
              A custom OneAgent installer will be generated for:
            </p>

            <div className="bg-nebula-navy-dark rounded-lg p-4 space-y-2 font-mono text-sm">
              {[
                ['Server ID', selectedHost?.id],
                ['Hostname', selectedHost?.name],
                ['IP', selectedHost?.ip],
                ['SSH User', selectedHost?.username ?? '—'],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between">
                  <span className="text-slate-400">{label}:</span>
                  <span className="text-white">{value}</span>
                </div>
              ))}
            </div>

            <p className="text-slate-400 text-sm">
              After downloading, upload the script to the target server and run:
            </p>

            <div className="bg-nebula-navy-dark rounded-lg p-4 space-y-2 font-mono text-sm">
              {[
                `chmod +x oneagent-install-${selectedHost?.name}.sh`,
                `sudo ./oneagent-install-${selectedHost?.name}.sh`,
              ].map((cmd) => (
                <div key={cmd} className="flex items-center justify-between gap-3">
                  <code className="text-green-400 break-all">{cmd}</code>
                  <button aria-label="Copy" className="text-slate-400 hover:text-white shrink-0"
                    onClick={() => copyToClipboard(cmd, 'Command')}>
                    <Copy className="size-4" />
                  </button>
                </div>
              ))}
            </div>

            <Button onClick={handleConfirmDownloadInstaller}
              className="w-full bg-gradient-to-r from-nebula-purple to-nebula-blue hover:from-nebula-purple-dark hover:to-nebula-blue text-white">
              <Download className="size-4 mr-2" />
              Download Installer
            </Button>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsInstallDialogOpen(false)}
              className="text-slate-400 hover:text-white">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <Trash2 className="size-4" /> Delete Host
            </DialogTitle>
          </DialogHeader>
          <p className="text-slate-300 text-sm">
            Are you sure you want to delete{' '}
            <span className="text-white font-semibold">{deleteHost?.name}</span>?{' '}
            This action cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={deleting}
              className="bg-transparent border-nebula-navy-lighter text-slate-300 hover:bg-nebula-navy-dark hover:text-white">
              Cancel
            </Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white min-w-[80px]"
              onClick={handleDeleteHost} disabled={deleting}>
              {deleting ? <RefreshCw className="size-4 animate-spin" /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
