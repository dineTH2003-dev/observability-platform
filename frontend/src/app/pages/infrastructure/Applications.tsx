import { useState, useEffect } from 'react';
import { Box, Search, Plus, Trash2, Activity, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Popover, PopoverTrigger, PopoverContent } from '../../components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '../../components/ui/command';
import { toast } from "sonner";
import type { Application } from '../../types/application';
import { applicationService } from '../../services/applicationService';

export function Applications() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState('');
  const [serverSearchOpen, setServerSearchOpen] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteApp, setDeleteApp] = useState<Application | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Mock servers data
  const servers = [
    { id: 'web-server-prod-01', name: 'web-server-prod-01' },
    { id: 'api-server-prod-02', name: 'api-server-prod-02' },
    { id: 'db-server-staging-01', name: 'db-server-staging-01' },
    { id: 'cache-server-prod-01', name: 'cache-server-prod-01' },
  ];

  useEffect(() => {
    loadApplications();
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    version: '',
    description: '',
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="size-4 text-green-400" />;
      case 'WARNING':
        return <AlertCircle className="size-4 text-yellow-400" />;
      case 'DOWN':
        return <Activity className="size-4 text-red-400" />;
      default:
        return <Activity className="size-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-500/10 text-green-400';
      case 'WARNING':
        return 'bg-yellow-500/10 text-yellow-400';
      case 'DOWN':
        return 'bg-red-500/10 text-red-400';
      default:
        return 'bg-slate-500/10 text-slate-400';
    }
  };

  const filteredApplications = applications.filter(app =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.version.includes(searchQuery) ||
    app.server_id.toLowerCase().includes(searchQuery.toLowerCase())
  );


  const loadApplications = async () => {
    try {
      setLoading(true);
      const response = await applicationService.getAll();
      setApplications(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !selectedServer) {
      alert("Application name and server are required.");
      return;
    }

    try {
      await applicationService.create({
        name: formData.name,
        description: formData.description,
        version: formData.version || "v1.0.0",
        server_id: selectedServer,
        application_status: "ACTIVE",
      });

      // Reset form
      setFormData({
        name: '',
        version: '',
        description: '',
      });
      setSelectedServer('');

      setIsDialogOpen(false);
      loadApplications();
    } catch (error) {
      console.error("Create failed", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteApp) return;

    try {
      await applicationService.delete(deleteApp.application_id);

      setApplications(prev =>
        prev.filter(app => app.application_id !== deleteApp.application_id)
      );

      toast.success("Application deleted successfully", {
        description: `${deleteApp.name} has been removed from monitoring`,
      });

    } catch (error) {
      console.error("Delete failed", error);

      toast.error("Delete failed", {
        description: "Something went wrong while deleting the application.",
      });

    } finally {
      setIsDeleteOpen(false);
      setDeleteApp(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Applications</h1>
          <p className="text-slate-400 text-sm mt-1">Register and manage applications running on your hosts</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
              <div className="space-y-2">
                <Label htmlFor="app-name">Application Name *</Label>
                <Input
                  id="app-name"
                  placeholder="e.g. user-service"
                  className="bg-nebula-navy-dark border-nebula-navy-lighter text-white placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  placeholder="v1.0.0"
                  className="bg-nebula-navy-dark border-nebula-navy-lighter text-white placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Short description of the application"
                  className="bg-nebula-navy-dark border-nebula-navy-lighter text-white placeholder:text-slate-500 min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Server *</Label>
                <Popover open={serverSearchOpen} onOpenChange={setServerSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={serverSearchOpen}
                      className="w-full justify-start bg-nebula-navy-dark border-nebula-navy-lighter text-white hover:bg-nebula-navy-dark hover:text-white"
                    >
                      {selectedServer || "Search server..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 bg-nebula-navy-light border-nebula-navy-lighter" align="start">
                    <Command className="bg-nebula-navy-light">
                      <CommandInput
                        placeholder="Search server..."
                        className="text-white"
                      />
                      <CommandList>
                        <CommandEmpty className="text-slate-400 py-6 text-center text-sm">No server found.</CommandEmpty>
                        <CommandGroup>
                          {servers.map((server) => (
                            <CommandItem
                              key={server.id}
                              value={server.name}
                              onSelect={(currentValue) => {
                                setSelectedServer(currentValue === selectedServer ? "" : currentValue);
                                setServerSearchOpen(false);
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
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="bg-transparent border-nebula-navy-lighter text-slate-300 hover:bg-nebula-navy-dark hover:text-white"
              >
                Close
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!formData.name || !selectedServer}
                className="bg-gradient-to-r from-purple-600 via-blue-500 to-blue-600 hover:from-purple-700 hover:via-blue-600 hover:to-blue-700 text-white"
              >
                Save
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
              placeholder="Search by name, version, server id..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-nebula-navy-dark border-nebula-navy-lighter text-white placeholder:text-slate-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-nebula-navy-dark border-b border-nebula-navy-lighter">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    APPLICATION
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    DESCRIPTION
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    VERSION
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    SERVER
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    STATUS
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    CREATED
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    UPDATED
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">

                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nebula-navy-lighter">
                {filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <Box className="size-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">No applications found.</p>
                    </td>
                  </tr>
                ) : (
                  filteredApplications.map((app) => (
                    <tr key={app.application_id} className="hover:bg-nebula-navy-dark transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-nebula-blue/10 flex items-center justify-center">
                            <Box className="size-5 text-nebula-blue" />
                          </div>
                          <span className="text-white font-medium">{app.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{app.description}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400">
                          {app.version}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{app.server_id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(app.application_status)}
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(app.application_status)}`}>
                            {app.application_status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{app.created_at}</td>
                      <td className="px-6 py-4 text-slate-300">{app.updated_at}</td>
                      <td className="px-6 py-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => {
                            setDeleteApp(app);
                            setIsDeleteOpen(true);
                          }}
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
        </CardContent>
      </Card>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-400">
              Delete Application
            </DialogTitle>
          </DialogHeader>

          <p className="text-slate-300 text-sm">
            Are you sure you want to delete this application? This action cannot be undone.
          </p>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              className="bg-transparent border-nebula-navy-lighter text-slate-300 hover:bg-nebula-navy-dark hover:text-white"
            >
              Cancel
            </Button>

            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}