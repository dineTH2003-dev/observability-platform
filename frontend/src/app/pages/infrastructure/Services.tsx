import { useState } from 'react';
import { Wrench, Search, Activity, CheckCircle, AlertCircle, XCircle, ExternalLink, Trash2 } from 'lucide-react';
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

interface Service {
  id: number;
  name: string;
  technology: string;
  instances: number;
  health: string;
  application: string;
  logsAnalysesActive: boolean;
}

interface ServicesProps {
  onNavigate?: (page: string, serviceId?: number) => void;
}

export function Services({ onNavigate }: ServicesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Available applications for the dropdown
  const applications = [
    'E-commerce Platform',
    'Payment Gateway',
    'User Management',
    'Analytics Engine',
    'Notification System',
    'Content Delivery',
  ];

  const [services, setServices] = useState<Service[]>([
    {
      id: 1,
      name: 'user-api',
      technology: 'Java',
      instances: 8,
      health: 'warning',
      application: 'User Management',
      logsAnalysesActive: true,
    },
    {
      id: 2,
      name: 'payment-processor',
      technology: 'Node.js',
      instances: 5,
      health: 'critical',
      application: 'Payment Gateway',
      logsAnalysesActive: false,
    },
    {
      id: 3,
      name: 'order-service',
      technology: 'Go',
      instances: 12,
      health: 'healthy',
      application: 'E-commerce Platform',
      logsAnalysesActive: true,
    },
    {
      id: 4,
      name: 'notification-api',
      technology: 'Python',
      instances: 6,
      health: 'healthy',
      application: 'Notification System',
      logsAnalysesActive: true,
    },
  ]);

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.technology.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.application.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleLogsAnalyses = (serviceId: number) => {
    setServices(prev => prev.map(service => 
      service.id === serviceId 
        ? { ...service, logsAnalysesActive: !service.logsAnalysesActive }
        : service
    ));
  };

  const updateServiceApplication = (serviceId: number, newApplication: string) => {
    setServices(prev => prev.map(service =>
      service.id === serviceId
        ? { ...service, application: newApplication }
        : service
    ));
  };

  const handleDeleteService = (serviceId: number) => {
    setServices(prev => prev.filter(service => service.id !== serviceId));
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy':
        return <CheckCircle className="size-4 text-green-400" />;
      case 'warning':
        return <AlertCircle className="size-4 text-yellow-400" />;
      case 'critical':
        return <XCircle className="size-4 text-red-400" />;
      default:
        return <Activity className="size-4 text-slate-400" />;
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'bg-green-500/10 text-green-400';
      case 'warning':
        return 'bg-yellow-500/10 text-yellow-400';
      case 'critical':
        return 'bg-red-500/10 text-red-400';
      default:
        return 'bg-slate-500/10 text-slate-400';
    }
  };

  const getTechnologyColor = (tech: string) => {
    const colors: Record<string, string> = {
      'Java': 'bg-orange-500/10 text-orange-400',
      'Node.js': 'bg-green-500/10 text-green-400',
      'Go': 'bg-cyan-500/10 text-cyan-400',
      'Python': 'bg-blue-500/10 text-blue-400',
    };
    return colors[tech] || 'bg-slate-500/10 text-slate-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Services</h1>
        <p className="text-slate-400 text-sm mt-1">Monitor microservices health and performance metrics</p>
      </div>

      {/* Search */}
      <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              placeholder="Search by service name, technology, application..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-nebula-navy-dark border-nebula-navy-lighter text-white placeholder:text-slate-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Services Table */}
      <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-nebula-navy-lighter">
                  <th className="text-left p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Service Name
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Technology
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Application
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Health
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Logs Analyses
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center">
                      <Wrench className="size-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">No services found.</p>
                    </td>
                  </tr>
                ) : (
                  filteredServices.map((service, index) => (
                    <tr
                      key={service.id}
                      className={`border-b border-nebula-navy-lighter hover:bg-nebula-navy-dark transition-colors ${
                        index === filteredServices.length - 1 ? 'border-b-0' : ''
                      }`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-nebula-cyan/10 flex items-center justify-center flex-shrink-0">
                            <Wrench className="size-5 text-nebula-cyan" />
                          </div>
                          <span className="text-white font-medium">{service.name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getTechnologyColor(service.technology)}`}>
                          {service.technology}
                        </span>
                      </td>
                      <td className="p-4">
                        <Select
                          value={service.application}
                          onValueChange={(value) => updateServiceApplication(service.id, value)}
                        >
                          <SelectTrigger className="w-[200px] bg-nebula-navy-dark border-nebula-navy-lighter text-white">
                            <SelectValue placeholder="Select application" />
                          </SelectTrigger>
                          <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
                            {applications.map((app) => (
                              <SelectItem key={app} value={app}>
                                {app}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {getHealthIcon(service.health)}
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getHealthColor(service.health)}`}>
                            {service.health}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleLogsAnalyses(service.id)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              service.logsAnalysesActive ? 'bg-green-500' : 'bg-slate-600'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                service.logsAnalysesActive ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                          <span className={`text-sm ${service.logsAnalysesActive ? 'text-green-400' : 'text-slate-500'}`}>
                            {service.logsAnalysesActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-nebula-blue hover:text-nebula-purple hover:bg-nebula-navy-lighter"
                            onClick={() => onNavigate?.('service-metrics', service.id)}
                          >
                            <ExternalLink className="size-4 mr-1" />
                            View Service Metrics
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteService(service.id)}
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
    </div>
  );
}
