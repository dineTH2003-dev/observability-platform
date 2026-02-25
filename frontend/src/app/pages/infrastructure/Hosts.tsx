import { useState } from 'react';
import { Server, Power, Activity, AlertCircle, Search, MoreVertical, Plus, CheckCircle, XCircle, Clock, Download, Copy, Terminal, Upload, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

interface Host {
  id: number;
  name: string;
  ip: string;
  env: string;
  health: string;
  agent: string;
}

export function Hosts() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isInstallDialogOpen, setIsInstallDialogOpen] = useState(false);
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);

  // Mock data - use state so we can delete items
  const [hosts, setHosts] = useState<Host[]>([
    { 
      id: 1, 
      name: 'web-server-prod-01', 
      ip: '10.10.10.1', 
      env: 'Production',
      health: 'Unknown', 
      agent: 'Inactive' 
    },
    { 
      id: 2, 
      name: 'api-server-prod-02', 
      ip: '10.10.10.12', 
      env: 'Production',
      health: 'Healthy', 
      agent: 'Active' 
    },
    { 
      id: 3, 
      name: 'db-server-staging-01', 
      ip: '10.10.20.5', 
      env: 'Staging',
      health: 'Warning', 
      agent: 'Active' 
    },
    { 
      id: 4, 
      name: 'cache-server-prod-01', 
      ip: '10.10.10.25', 
      env: 'Production',
      health: 'Critical', 
      agent: 'Error' 
    },
    { 
      id: 5, 
      name: 'worker-dev-03', 
      ip: '192.168.1.45', 
      env: 'Development',
      health: 'Healthy', 
      agent: 'Active' 
    },
    { 
      id: 6, 
      name: 'app-server-staging-02', 
      ip: '10.10.20.18', 
      env: 'Staging',
      health: 'Unknown', 
      agent: 'Inactive' 
    },
  ]);

  const filteredHosts = hosts.filter(host =>
    host.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    host.ip.includes(searchQuery) ||
    host.env.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInstallAgent = (host: Host) => {
    setSelectedHost(host);
    setIsDialogOpen(false);
    setIsInstallDialogOpen(true);
  };

  const handleDeleteHost = (hostId: number) => {
    const host = hosts.find(h => h.id === hostId);
    setHosts(hosts.filter(host => host.id !== hostId));
    toast.success('Host deleted successfully', {
      description: `${host?.name} has been removed from monitoring`,
    });
  };

  const getHealthBadgeStyle = (health: string) => {
    switch (health.toLowerCase()) {
      case 'healthy':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'warning':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'critical':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getAgentBadgeStyle = (agent: string) => {
    switch (agent) {
      case 'Active':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'Error':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'Inactive':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getAgentTooltip = (agent: string) => {
    if (agent === 'Inactive') {
      return 'Installation Pending';
    }
    return agent;
  };

  const isAgentActive = (agent: string) => {
    return agent === 'Active';
  };

  const isAgentError = (agent: string) => {
    return agent === 'Error';
  };

  const handleDownloadAgent = (host: Host) => {
    if (isAgentActive(host.agent) || isAgentError(host.agent)) {
      // Agent already installed or error, do nothing
      return;
    }
    handleInstallAgent(host);
  };

  const handleRegisterHost = () => {
    const hostNameInput = document.getElementById('host-name') as HTMLInputElement;
    const hostName = hostNameInput?.value || 'New Host';
    
    setIsDialogOpen(false);
    toast.success('Host registered successfully', {
      description: `${hostName} has been added to your infrastructure`,
    });
    // After registration, show install dialog
    handleInstallAgent(hosts[0]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Hosts</h1>
          <p className="text-slate-400 text-sm mt-1">Monitor infrastructure health and connected agents.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
              <div className="space-y-2">
                <Label htmlFor="host-name" className="text-slate-300">Host Name *</Label>
                <Input 
                  id="host-name" 
                  placeholder=""
                  className="bg-nebula-navy-dark border-nebula-navy-lighter text-white placeholder:text-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ip-address" className="text-slate-300">IP Address *</Label>
                <Input 
                  id="ip-address" 
                  placeholder=""
                  className="bg-nebula-navy-dark border-nebula-navy-lighter text-white placeholder:text-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ssh-username" className="text-slate-300">SSH Username *</Label>
                <Input 
                  id="ssh-username" 
                  placeholder=""
                  className="bg-nebula-navy-dark border-nebula-navy-lighter text-white placeholder:text-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="os-type" className="text-slate-300">OS Type</Label>
                <Select>
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
              <div className="space-y-2">
                <Label htmlFor="environment" className="text-slate-300">Environment *</Label>
                <Select>
                  <SelectTrigger className="bg-nebula-navy-dark border-nebula-navy-lighter text-white">
                    <SelectValue placeholder="Select environment" />
                  </SelectTrigger>
                  <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="development">Development</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-slate-300">Description</Label>
                <Textarea 
                  id="description" 
                  placeholder=""
                  className="bg-nebula-navy-dark border-nebula-navy-lighter text-white placeholder:text-slate-600 min-h-[80px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ssh-port" className="text-slate-300">SSH Port</Label>
                <Input 
                  id="ssh-port" 
                  placeholder="22"
                  defaultValue="22"
                  className="bg-nebula-navy-dark border-nebula-navy-lighter text-white placeholder:text-slate-600"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                className="flex-1 bg-transparent border-nebula-navy-lighter text-slate-300 hover:bg-nebula-navy-dark hover:text-white"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleRegisterHost}
                className="flex-1 bg-nebula-purple hover:bg-nebula-purple-dark text-white"
              >
                Register Host
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              placeholder="Search by hostname, IP, environment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-nebula-navy-dark border-nebula-navy-lighter text-white placeholder:text-slate-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Hosts Table */}
      <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
        <CardContent className="p-0">
          <TooltipProvider>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-nebula-navy-dark border-b border-nebula-navy-lighter">
                  <tr>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      HOST
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      IP
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      ENV
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      HEALTH
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      AGENT
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nebula-navy-lighter">
                  {filteredHosts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <Server className="size-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">No hosts found.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredHosts.map((host) => (
                      <tr key={host.id} className="hover:bg-nebula-navy-dark transition-colors">
                        <td className="px-6 py-4 text-white font-medium">{host.name}</td>
                        <td className="px-6 py-4 text-slate-300">{host.ip}</td>
                        <td className="px-6 py-4 text-slate-300">{host.env}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getHealthBadgeStyle(host.health)}`}>
                            {host.health}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => handleDownloadAgent(host)}
                                  className={`transition-all ${
                                    isAgentActive(host.agent) || isAgentError(host.agent)
                                      ? 'cursor-default'
                                      : 'hover:text-nebula-purple cursor-pointer'
                                  } ${
                                    isAgentError(host.agent) ? 'text-red-400' : 'text-slate-400'
                                  }`}
                                  disabled={isAgentActive(host.agent) || isAgentError(host.agent)}
                                >
                                  {isAgentActive(host.agent) ? (
                                    <CheckCircle className="size-4" />
                                  ) : isAgentError(host.agent) ? (
                                    <AlertTriangle className="size-4" />
                                  ) : (
                                    <Download className="size-4" />
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent 
                                className="bg-nebula-navy-dark border-nebula-navy-lighter text-white"
                                sideOffset={5}
                              >
                                <p>
                                  {isAgentActive(host.agent) 
                                    ? 'Agent Installed' 
                                    : isAgentError(host.agent)
                                    ? 'Agent Installation Failed'
                                    : 'Install Agent'}
                                </p>
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getAgentBadgeStyle(host.agent)}`}>
                                  {host.agent}
                                </span>
                              </TooltipTrigger>
                              {host.agent === 'Inactive' && (
                                <TooltipContent 
                                  className="bg-nebula-navy-dark border-nebula-navy-lighter text-white"
                                  sideOffset={5}
                                >
                                  <p>{getAgentTooltip(host.agent)}</p>
                                </TooltipContent>
                              )}
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => handleDeleteHost(host.id)}
                                  className="text-red-400 hover:text-red-300 transition-colors ml-auto"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent 
                                className="bg-nebula-navy-dark border-nebula-navy-lighter text-white"
                                sideOffset={5}
                              >
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
        </CardContent>
      </Card>

      {/* Install Agent Dialog */}
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
              <div className="flex justify-between">
                <span className="text-slate-400">Server ID:</span>
                <span className="text-white">5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Hostname:</span>
                <span className="text-white">{selectedHost?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">IP:</span>
                <span className="text-white">{selectedHost?.ip}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">SSH User:</span>
                <span className="text-white">Ubuntu</span>
              </div>
            </div>

            <p className="text-slate-400 text-sm">
              After downloading, upload the script to the target server and run:
            </p>

            <div className="bg-nebula-navy-dark rounded-lg p-4 space-y-2 font-mono text-sm">
              <div className="flex items-center justify-between">
                <code className="text-green-400">chmod +x oneagent-install-{selectedHost?.name}.sh</code>
                <button className="text-slate-400 hover:text-white">
                  <Copy className="size-4" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <code className="text-green-400">sudo ./oneagent-install-{selectedHost?.name}.sh</code>
                <button className="text-slate-400 hover:text-white">
                  <Copy className="size-4" />
                </button>
              </div>
            </div>

            <Button 
              className="w-full bg-gradient-to-r from-nebula-purple to-nebula-blue hover:from-nebula-purple-dark hover:to-nebula-blue text-white"
            >
              <Download className="size-4 mr-2" />
              Download Installer
            </Button>
          </div>
          <DialogFooter>
            <Button 
              variant="ghost"
              onClick={() => setIsInstallDialogOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}