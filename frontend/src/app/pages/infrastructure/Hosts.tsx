import { useState } from 'react';
import { Server, Search, Plus, Trash2, Download, Copy, Upload } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
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
      name: 'App1', 
      ip: '10.10.10.1', 
      env: 'os',
      health: 'Unknown', 
      agent: 'Unknown' 
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
    setHosts(hosts.filter(host => host.id !== hostId));
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
              <DialogDescription className="text-slate-400">
                Add a new host to your infrastructure monitoring
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="host-name">Host Name *</Label>
                <Input 
                  id="host-name" 
                  placeholder="e.g., prod-web-02"
                  className="bg-nebula-navy-dark border-nebula-navy-lighter text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ip-address">IP Address *</Label>
                <Input 
                  id="ip-address" 
                  placeholder="192.168.1.100"
                  className="bg-nebula-navy-dark border-nebula-navy-lighter text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ssh-username">SSH Username *</Label>
                <Input 
                  id="ssh-username" 
                  placeholder="ubuntu"
                  className="bg-nebula-navy-dark border-nebula-navy-lighter text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="os-type">OS Type</Label>
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
                <Label htmlFor="environment">Environment *</Label>
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
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  placeholder="Optional description of this host"
                  className="bg-nebula-navy-dark border-nebula-navy-lighter text-white placeholder:text-slate-500 min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pem-file" className="text-slate-300">PEM File *</Label>
                <div className="relative">
                  <Input 
                    id="pem-file" 
                    type="file"
                    accept=".pem"
                    className="hidden"
                  />
                  <label 
                    htmlFor="pem-file"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-nebula-navy-dark border border-dashed border-nebula-navy-lighter rounded-lg text-slate-400 hover:text-white hover:border-nebula-purple/50 cursor-pointer transition-colors"
                  >
                    <Upload className="size-4" />
                    <span className="text-sm">Select PEM File</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ssh-port">SSH Port</Label>
                <Input 
                  id="ssh-port" 
                  placeholder="22"
                  defaultValue="22"
                  className="bg-nebula-navy-dark border-nebula-navy-lighter text-white"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                className="bg-transparent border-nebula-navy-lighter text-slate-300 hover:bg-nebula-navy-dark hover:text-white"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  setIsDialogOpen(false);
                  // After registration, show install dialog
                  handleInstallAgent(hosts[0]);
                }}
                className="bg-gradient-to-r from-purple-600 via-blue-500 to-blue-600 hover:from-purple-700 hover:via-blue-600 hover:to-blue-700 text-white"
              >
                Register
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
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nebula-navy-lighter">
                {filteredHosts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
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
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                          {host.health}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                          {host.agent}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => handleInstallAgent(host)}
                            className="border-nebula-purple text-nebula-purple hover:bg-nebula-purple/10"
                          >
                            Install Agent
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteHost(host.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="size-4" />
                          </Button>
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