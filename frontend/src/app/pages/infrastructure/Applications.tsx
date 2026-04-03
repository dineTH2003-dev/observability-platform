import { hostService } from '../../services/hostService';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Search, Plus, Trash2, Activity,
  CheckCircle, AlertCircle, ChevronLeft, ChevronRight,
  RefreshCw, ServerCrash,
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Dialog, DialogTrigger, DialogContent,
  DialogHeader, DialogTitle, DialogFooter,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Popover, PopoverTrigger, PopoverContent } from '../../components/ui/popover';
import { Command, CommandList, CommandEmpty, CommandGroup, CommandItem } from '../../components/ui/command';
import { toast } from 'sonner';
import type { Application } from '../../types/application';
import { applicationService } from '../../services/applicationService';

// Constants
const STATUS_TABS = ['ALL', 'ACTIVE', 'WARNING', 'DOWN'] as const;
const PAGE_SIZE_OPTIONS = [10, 25, 50];
const EMPTY_FORM = { name: '', version: '', description: '' };
type StatusTab = typeof STATUS_TABS[number];

// Types
interface Server {
  id: number;
  name: string;
}

interface FormErrors {
  name?: string;
  server?: string;
}

// Helpers
function formatDate(raw: string | null | undefined): string {
  if (!raw) return '—';
  const d = new Date(raw);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

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

// Status helpers
function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'ACTIVE': return <CheckCircle className="size-4 text-green-400" />;
    case 'WARNING': return <AlertCircle className="size-4 text-yellow-400" />;
    case 'DOWN': return <Activity className="size-4 text-red-400" />;
    default: return <Activity className="size-4 text-slate-400" />;
  }
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'ACTIVE': return 'bg-green-500/10  text-green-400';
    case 'WARNING': return 'bg-yellow-500/10 text-yellow-400';
    case 'DOWN': return 'bg-red-500/10    text-red-400';
    default: return 'bg-slate-500/10  text-slate-400';
  }
}

function tabRingClass(tab: StatusTab, active: StatusTab): string {
  if (tab !== active) return 'text-slate-400 hover:text-white border-transparent';
  switch (tab) {
    case 'ACTIVE': return 'text-green-400  border-green-400';
    case 'WARNING': return 'text-yellow-400 border-yellow-400';
    case 'DOWN': return 'text-red-400    border-red-400';
    default: return 'text-white       border-nebula-blue';
  }
}

// Skeleton row
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 rounded bg-nebula-navy-lighter" style={{ width: `${60 + (i * 13) % 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

// Custom hook
function useApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const serverMap = useMemo<Record<number, string>>(
    () => Object.fromEntries(servers.map((s) => [s.id, s.name])),
    [servers],
  );

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setLoadError(null);
    try {
      const [appRes, hostRes] = await Promise.all([
        applicationService.getAll(),
        hostService.getAll(),
      ]);
      setApplications(appRes.data);
      setServers(hostRes.map((h: any) => ({ id: h.server_id, name: h.hostname })));
    } catch (err) {
      console.error('Failed to load data:', err);
      setLoadError('Failed to load applications. Please try again.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(
    async (payload: Omit<Partial<Application>, 'application_id'>) => {
      await applicationService.create(payload);
      await load(true);
    },
    [load],
  );

  const remove = useCallback(async (app: Application) => {
    await applicationService.delete(app.application_id);
    setApplications((prev) => prev.filter((a) => a.application_id !== app.application_id));
  }, []);

  return { applications, servers, serverMap, loading, loadError, load, create, remove };
}

// Main component
export function Applications() {
  // Data
  const { applications, servers, serverMap, loading, loadError, load, create, remove } =
    useApplications();

  // Search / filter / pagination
  const [rawSearch, setRawSearch] = useState('');
  const [activeTab, setActiveTab] = useState<StatusTab>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const search = useDebounce(rawSearch, 250);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [selectedServer, setSelectedServer] = useState('');
  const [serverSearchOpen, setServerSearchOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Delete state
  const [deleteApp, setDeleteApp] = useState<Application | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Reset page when filters change
  useEffect(() => setCurrentPage(1), [search, activeTab, pageSize]);

  // Derived data
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: applications.length };
    applications.forEach((a) => {
      counts[a.application_status] = (counts[a.application_status] ?? 0) + 1;
    });
    return counts;
  }, [applications]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return applications.filter((app) => {
      const matchesStatus = activeTab === 'ALL' || app.application_status === activeTab;
      if (!matchesStatus) return false;
      if (!q) return true;
      const serverName = safeStr(serverMap[app.server_id]).toLowerCase();
      return (
        safeStr(app.name).toLowerCase().includes(q) ||
        safeStr(app.description).toLowerCase().includes(q) ||
        safeStr(app.version).toLowerCase().includes(q) ||
        serverName.includes(q)
      );
    });
  }, [applications, search, activeTab, serverMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Form helpers
  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    if (!formData.name.trim()) errors.name = 'Application name is required.';
    if (!selectedServer) errors.server = 'Please select a server.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetDialog = () => {
    setFormData(EMPTY_FORM);
    setSelectedServer('');
    setFormErrors({});
    setSubmitting(false);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) resetDialog();
  };

  const handleCancelRegister = () => {
    setIsDialogOpen(false);
    resetDialog();
  };

  // Handlers
  const handleCreate = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      await create({
        name: formData.name.trim(),
        description: formData.description.trim(),
        version: formData.version.trim() || 'v1.0.0',
        server_id: Number(selectedServer),
        application_status: 'ACTIVE',
      });
      toast.success('Application registered', {
        description: `${formData.name.trim()} is now being monitored.`,
      });
      setIsDialogOpen(false);
      resetDialog();
    } catch (err) {
      console.error('Create failed:', err);
      toast.error('Registration failed', {
        description: 'Something went wrong. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteApp) return;
    setDeleting(true);
    try {
      await remove(deleteApp);
      toast.success('Application deleted', {
        description: `${deleteApp.name} has been removed from monitoring.`,
      });
      setIsDeleteOpen(false);
      setDeleteApp(null);
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('Delete failed', {
        description: 'Something went wrong. Please try again.',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleRefresh = () => {
    load();
    toast.info('Refreshing applications…');
  };

  // Render
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Applications</h1>
          <p className="text-slate-400 text-sm mt-1">
            Register and manage applications running on your hosts
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
                Register Application
              </Button>
            </DialogTrigger>

            <DialogContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white max-w-md">
              <DialogHeader>
                <DialogTitle>Register Application</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Name */}
                <div className="space-y-1">
                  <Label htmlFor="app-name">Application Name <span className="text-red-400">*</span></Label>
                  <Input
                    id="app-name"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (formErrors.name) setFormErrors({ ...formErrors, name: undefined });
                    }}
                    placeholder="e.g. user-service"
                    className={`bg-nebula-navy-dark border text-white placeholder:text-slate-500 ${formErrors.name ? 'border-red-500 focus-visible:ring-red-500' : 'border-nebula-navy-lighter'
                      }`}
                  />
                  {formErrors.name && (
                    <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                      <AlertCircle className="size-3" /> {formErrors.name}
                    </p>
                  )}
                </div>

                {/* Version */}
                <div className="space-y-1">
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="v1.0.0"
                    className="bg-nebula-navy-dark border-nebula-navy-lighter text-white placeholder:text-slate-500"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Short description of the application"
                    className="bg-nebula-navy-dark border-nebula-navy-lighter text-white placeholder:text-slate-500 min-h-[80px]"
                  />
                </div>

                {/* Server */}
                <div className="space-y-1">
                  <Label>Server <span className="text-red-400">*</span></Label>
                  <Popover open={serverSearchOpen} onOpenChange={setServerSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={serverSearchOpen}
                        className={`w-full justify-start bg-nebula-navy-dark border text-white hover:bg-nebula-navy-dark hover:text-white ${formErrors.server ? 'border-red-500' : 'border-nebula-navy-lighter'
                          }`}
                      >
                        {selectedServer
                          ? servers.find((s) => s.id.toString() === selectedServer)?.name
                          : <span className="text-slate-500">Search server…</span>
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 bg-nebula-navy-light border-nebula-navy-lighter" align="start">
                      <Command className="bg-nebula-navy-light">
                        <CommandList>
                          <CommandEmpty className="text-slate-400 py-6 text-center text-sm">
                            No server found.
                          </CommandEmpty>
                          <CommandGroup>
                            {servers.map((server) => (
                              <CommandItem
                                key={server.id}
                                value={server.id.toString()}
                                onSelect={() => {
                                  setSelectedServer(server.id.toString());
                                  setServerSearchOpen(false);
                                  if (formErrors.server) setFormErrors({ ...formErrors, server: undefined });
                                }}
                                className="text-white hover:bg-nebula-navy-dark cursor-pointer"
                              >
                                {server.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {formErrors.server && (
                    <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                      <AlertCircle className="size-3" /> {formErrors.server}
                    </p>
                  )}
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
                  onClick={handleCreate}
                  disabled={submitting}
                  className="bg-gradient-to-r from-purple-600 via-blue-500 to-blue-600 hover:from-purple-700 hover:via-blue-600 hover:to-blue-700 text-white min-w-[80px]"
                >
                  {submitting ? <RefreshCw className="size-4 animate-spin" /> : 'Save'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Error state */}
      {loadError && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <ServerCrash className="size-5 text-red-400 shrink-0" />
            <p className="text-red-400 text-sm flex-1">{loadError}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
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
              placeholder="Search by name, version, server…"
              value={rawSearch}
              onChange={(e) => setRawSearch(e.target.value)}
              className="pl-10 bg-nebula-navy-dark border-nebula-navy-lighter text-white placeholder:text-slate-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 border-b border-nebula-navy-lighter">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tabRingClass(tab, activeTab)}`}
          >
            {tab}
            <span
              className={`ml-2 inline-flex bg-nebula-navy-lighter items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold ${tabRingClass(tab, activeTab)}`}>
              {statusCounts[tab] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-nebula-navy-dark border-b border-nebula-navy-lighter">
                <tr>
                  {['Application', 'Description', 'Version', 'Server', 'Status', 'Created', 'Updated', ''].map((h) => (
                    <th
                      key={h}
                      className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-nebula-navy-lighter">
                {loading ? (
                  Array.from({ length: pageSize > 5 ? 5 : pageSize }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center">
                      <Box className="size-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400 font-medium">No applications found</p>
                      <p className="text-slate-500 text-sm mt-1">
                        {search || activeTab !== 'ALL'
                          ? 'Try adjusting your search or filters.'
                          : 'Register your first application to get started.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginated.map((app) => (
                    <tr
                      key={app.application_id}
                      className="hover:bg-nebula-navy-dark transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-nebula-blue/10 flex items-center justify-center shrink-0">
                            <Box className="size-5 text-nebula-blue" />
                          </div>
                          <span className="text-white font-medium">{app.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-300 max-w-[200px] truncate" title={safeStr(app.description)}>
                        {safeStr(app.description) || <span className="text-slate-500 italic">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400">
                          {safeStr(app.version) || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {serverMap[app.server_id] ?? (
                          <span className="text-slate-500 font-mono text-xs">#{app.server_id}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <StatusIcon status={app.application_status} />
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClass(app.application_status)}`}>
                            {app.application_status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-300 text-sm whitespace-nowrap">
                        {formatDate(app.created_at)}
                      </td>
                      <td className="px-6 py-4 text-slate-300 text-sm whitespace-nowrap">
                        {formatDate(app.updated_at)}
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => { setDeleteApp(app); setIsDeleteOpen(true); }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && filtered.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-nebula-navy-lighter">
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <span>
                  {filtered.length === 0
                    ? '0'
                    : `${(currentPage - 1) * pageSize + 1}–${Math.min(
                      currentPage * pageSize,
                      filtered.length
                    )}`}
                  {' '}of {filtered.length}
                </span>

                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => setPageSize(Number(value))}
                >
                  <SelectTrigger className="w-[100px] bg-nebula-navy-dark border border-nebula-navy-lighter text-slate-300 rounded px-2 py-1 text-xs">
                    <SelectValue placeholder="Page size" />
                  </SelectTrigger>

                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} / page
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="text-slate-400 hover:text-white hover:bg-nebula-navy-lighter disabled:opacity-30"
                >
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
                      <span key={`ellipsis-${i}`} className="px-2 text-slate-500 text-sm">…</span>
                    ) : (
                      <Button
                        key={p}
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentPage(p as number)}
                        className={`min-w-[32px] text-sm ${currentPage === p
                          ? 'bg-nebula-blue/20 text-nebula-blue'
                          : 'text-slate-400 hover:text-white hover:bg-nebula-navy-lighter'
                          }`}
                      >
                        {p}
                      </Button>
                    ),
                  )}
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="text-slate-400 hover:text-white hover:bg-nebula-navy-lighter disabled:opacity-30"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <Trash2 className="size-4" /> Delete Application
            </DialogTitle>
          </DialogHeader>
          <p className="text-slate-300 text-sm">
            Are you sure you want to delete{' '}
            <span className="text-white font-semibold">{deleteApp?.name}</span>?{' '}
            This action cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={deleting}
              className="bg-transparent border-nebula-navy-lighter text-slate-300 hover:bg-nebula-navy-dark hover:text-white"
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white min-w-[80px]"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <RefreshCw className="size-4 animate-spin" /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}