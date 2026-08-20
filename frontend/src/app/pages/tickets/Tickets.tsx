import { useEffect, useState } from 'react';
import api from '../../../api/api';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  TicketIcon, Plus, Filter, MessageSquare,
  XCircle, AlertCircle, Settings, Key, FileText
} from 'lucide-react';

type TicketPurpose = 'Alert Configuration Request' | 'Service / Application Management' | 'Access / Permission Request' | 'Incident Follow-up' | 'General Inquiry' | null;
type TicketStatus = 'open' | 'in-review' | 'approved' | 'rejected' | 'resolved';
type TicketPriority = 'low' | 'medium' | 'high';

interface Ticket {
  id: string;
  title: string;
  purpose: string;
  status: TicketStatus;
  priority: TicketPriority;
  requester: string;
  role: string;
  context: string;
  created: string;
  updated: string;
  description: string;
  linkedIncident?: string;
  requestedChange?: string;
  reason?: string;
}

export function Tickets({ selectedTicketId, selectionEpoch }: { selectedTicketId?: string, selectionEpoch?: number }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [filterPurpose, setFilterPurpose] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const [tickets, setTickets] = useState<Ticket[]>([]);

  const fetchTickets = async () => {
    try {
      const { data } = await api.get('/tickets', {
        params: {
          purpose: filterPurpose,
          priority: filterPriority,
        },
      });

      const mappedData: Ticket[] = data.map((t: any) => ({
        id: t.ticket_id,
        title: t.title,
        purpose: t.purpose,
        status: t.status?.toLowerCase().replace(" ", "-") || "open",
        priority: t.priority?.toLowerCase() || "medium",
        requester: "You",
        role: "Engineer",
        context: t.context,
        created: new Date(t.created_at).toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }),
        updated: new Date(t.updated_at || t.created_at).toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }),
        description: t.title,
      }));

      setTickets(mappedData);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [filterPurpose, filterPriority]);

  useEffect(() => {
    if (selectedTicketId && tickets.length > 0) {
      const ticket = tickets.find(t => t.id === selectedTicketId);
      if (ticket) {
        setSelectedTicket(ticket);
      }
    }
  }, [selectedTicketId, selectionEpoch, tickets]);

  const getPriorityColor = (priority: TicketPriority) => {
    switch (priority) {
      case 'high':
        return 'text-red-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-blue-400';
      default:
        return 'text-slate-400';
    }
  };

  const getPurposeIcon = (purpose: string) => {
    if (purpose.includes('Alert')) return <Settings className="size-4" />;
    if (purpose.includes('Service')) return <FileText className="size-4" />;
    if (purpose.includes('Access')) return <Key className="size-4" />;
    if (purpose.includes('Incident')) return <AlertCircle className="size-4" />;
    return <MessageSquare className="size-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Tickets</h1>
          <p className="text-slate-400 text-sm mt-1">Manage configuration requests and operational support</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-nebula-purple to-nebula-blue hover:from-nebula-purple/90 hover:to-nebula-blue/90 text-white"
        >
          <Plus className="size-4 mr-2" />
          Create Ticket
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Filter by Purpose */}
            <div>
              <Select value={filterPurpose} onValueChange={setFilterPurpose}>
                <SelectTrigger className="w-full bg-nebula-navy-dark border-nebula-navy-lighter text-white">
                  <Filter className="size-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="All Purposes" />
                </SelectTrigger>
                <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
                  <SelectItem value="all">All Purposes</SelectItem>
                  <SelectItem value="Alert Configuration Request">Alert Configuration Request</SelectItem>
                  <SelectItem value="Service / Application Management">Service / Application Management</SelectItem>
                  <SelectItem value="Access / Permission Request">Access / Permission Request</SelectItem>
                  <SelectItem value="Incident Follow-up">Incident Follow-up</SelectItem>
                  <SelectItem value="General Inquiry">General Inquiry</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Filter by Priority */}
            <div>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-full bg-nebula-navy-dark border-nebula-navy-lighter text-white">
                  <Filter className="size-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-nebula-navy-lighter">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">ID</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Purpose</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Priority</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Created</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="border-b border-nebula-navy-lighter/50 hover:bg-nebula-navy-dark/50"
                  >
                    <td className="py-3 px-4">
                      <span className="text-sm font-mono text-nebula-cyan">{ticket.id}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-slate-200 font-medium">
                        {getPurposeIcon(ticket.purpose)}
                        <span className="text-sm">{ticket.purpose}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`text-sm font-medium ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-slate-400">{ticket.created}</span>
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-nebula-purple text-nebula-purple hover:bg-nebula-purple/10"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          setSelectedTicket(ticket);
                        }}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {tickets.length === 0 && (
            <div className="text-center py-12">
              <TicketIcon className="size-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No tickets found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <CreateTicketModal
          onClose={() => setShowCreateModal(false)}
          onCreated={fetchTickets}
        />
      )}

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <TicketDetailsModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}
    </div>
  );
}

// Create Ticket Modal Component
function CreateTicketModal({ onClose, onCreated }: any) {
  const [context, setContext] = useState('');
  const [description, setDescription] = useState('');
  const [ticketPurpose, setTicketPurpose] = useState<TicketPurpose>(null);
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [appAlertConfig, setAppAlertConfig] = useState('');
  const [envAlertConfig, setEnvAlertConfig] = useState('');
  const [alertType, setAlertType] = useState('');
  const [reasonRequest, setReasonRequest] = useState('');
  const handleSubmit = async () => {
    try {
      await api.post('/tickets', {
        purpose: ticketPurpose,
        context,
        priority,
      });

      onCreated();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="bg-nebula-navy-light border-nebula-navy-lighter w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Create New Ticket</h2>
              <p className="text-sm text-slate-400 mt-1">Submit a configuration or operational request</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400 hover:text-white">
              <XCircle className="size-5" />
            </Button>
          </div>

          <div className="space-y-6">
            {/* Section 1: Ticket Purpose */}
            <div>
              <Label className="text-white mb-2 block">Ticket Purpose *</Label>
              <Select value={ticketPurpose || undefined} onValueChange={(value) => setTicketPurpose(value as TicketPurpose)}>
                <SelectTrigger className="bg-nebula-navy-dark border-nebula-navy-lighter text-white">
                  <SelectValue placeholder="Select ticket purpose" />
                </SelectTrigger>
                <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
                  <SelectItem value="Alert Configuration Request">
                    <div className="flex items-center gap-2">
                      <Settings className="size-4" />
                      Alert Configuration Request
                    </div>
                  </SelectItem>
                  <SelectItem value="Service / Application Management">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4" />
                      Service / Application Management
                    </div>
                  </SelectItem>
                  <SelectItem value="Access / Permission Request">
                    <div className="flex items-center gap-2">
                      <Key className="size-4" />
                      Access / Permission Request
                    </div>
                  </SelectItem>
                  <SelectItem value="Incident Follow-up">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="size-4" />
                      Incident Follow-up
                    </div>
                  </SelectItem>
                  <SelectItem value="General Inquiry">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="size-4" />
                      General Inquiry
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Section 2: Dynamic Context Fields */}
            {ticketPurpose === 'Alert Configuration Request' && (
              <AlertConfigurationForm
                description={description}
                setDescription={setDescription}
                reasonRequest={reasonRequest}
                setReasonRequest={setReasonRequest}
                appAlertConfig={appAlertConfig}
                setAppAlertConfig={setAppAlertConfig}
                envAlertConfig={envAlertConfig}
                setEnvAlertConfig={setEnvAlertConfig}
                alertType={alertType}
                setAlertType={setAlertType}
              />
            )}

            {ticketPurpose === 'Service / Application Management' && (
              <ServiceManagementForm
                context={context}
                setContext={setContext}
                description={description}
                setDescription={setDescription}
                reasonRequest={reasonRequest}
                setReasonRequest={setReasonRequest}
              />
            )}

            {ticketPurpose === 'Access / Permission Request' && (
              <AccessRequestForm
                description={description}
                setDescription={setDescription}
                reasonRequest={reasonRequest}
                setReasonRequest={setReasonRequest}
              />
            )}

            {ticketPurpose === 'Incident Follow-up' && (
              <IncidentFollowupForm
                description={description}
                setDescription={setDescription}
                reasonRequest={reasonRequest}
                setReasonRequest={setReasonRequest}
              />
            )}

            {ticketPurpose === 'General Inquiry' && (
              <GeneralInquiryForm
                description={description}
                setDescription={setDescription}
              />
            )}

            {/* Section 3: Priority */}
            {ticketPurpose && (
              <>
                <div>
                  <Label className="text-white mb-2 block">Priority *</Label>
                  <Select value={priority} onValueChange={(value) => setPriority(value as TicketPriority)}>
                    <SelectTrigger className="bg-nebula-navy-dark border-nebula-navy-lighter text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-nebula-navy-lighter">
                  <Button variant="outline" onClick={onClose} className="border-nebula-navy-lighter text-white">
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} className="bg-gradient-to-r from-nebula-purple to-nebula-blue hover:from-nebula-purple/90 hover:to-nebula-blue/90 text-white">
                    Submit Ticket
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Alert Configuration Form
function AlertConfigurationForm({ description, setDescription, reasonRequest, setReasonRequest, appAlertConfig, setAppAlertConfig, envAlertConfig, setEnvAlertConfig, alertType, setAlertType }: any) {
  return (
    <div className="space-y-4 p-4 bg-nebula-navy-dark rounded-lg border border-nebula-navy-lighter">
      <h3 className="text-sm font-semibold text-white">Alert Configuration Details</h3>

      <div>
        <Label className="text-slate-300 mb-2 block text-sm">Application *</Label>
        <Select value={appAlertConfig} onValueChange={setAppAlertConfig}>
          <SelectTrigger className="bg-nebula-navy border-nebula-navy-lighter text-white">
            <SelectValue placeholder="Select application" />
          </SelectTrigger>
          <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
            <SelectItem value="user-service">User Service</SelectItem>
            <SelectItem value="api-gateway">API Gateway</SelectItem>
            <SelectItem value="auth-service">Auth Service</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-slate-300 mb-2 block text-sm">Environment *</Label>
        <Select value={envAlertConfig} onValueChange={setEnvAlertConfig}>
          <SelectTrigger className="bg-nebula-navy border-nebula-navy-lighter text-white">
            <SelectValue placeholder="Select environment" />
          </SelectTrigger>
          <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
            <SelectItem value="production">Production</SelectItem>
            <SelectItem value="staging">Staging</SelectItem>
            <SelectItem value="development">Development</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-slate-300 mb-2 block text-sm">Alert Type *</Label>
        <Select value={alertType} onValueChange={setAlertType}>
          <SelectTrigger className="bg-nebula-navy border-nebula-navy-lighter text-white">
            <SelectValue placeholder="Select alert type" />
          </SelectTrigger>
          <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
            <SelectItem value="incident">Incident Alerts</SelectItem>
            <SelectItem value="health">Health Monitoring</SelectItem>
            <SelectItem value="anomaly">Anomaly Detection</SelectItem>
            <SelectItem value="all">All Alert Types</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-slate-300 mb-2 block text-sm">Description *</Label>
        <Textarea
          value={description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
          placeholder="Describe your request..."
          className="bg-nebula-navy border-nebula-navy-lighter text-white placeholder:text-slate-500 min-h-24"
        />
      </div>

      <div>
        <Label className="text-slate-300 mb-2 block text-sm">Reason for Request *</Label>
        <Textarea
          value={reasonRequest}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReasonRequest(e.target.value)}
          placeholder="Why is this configuration needed?"
          className="bg-nebula-navy border-nebula-navy-lighter text-white placeholder:text-slate-500"
        />
      </div>
    </div>
  );
}

// Service Management Form
function ServiceManagementForm({ context, setContext, description, setDescription, reasonRequest, setReasonRequest }: any) {
  const [appService, setAppService] = useState('');
  const [host, setHost] = useState('');

  return (
    <div className="space-y-4 p-4 bg-nebula-navy-dark rounded-lg border border-nebula-navy-lighter">
      <h3 className="text-sm font-semibold text-white">Service Management Details</h3>

      <div>
        <Label className="text-slate-300 mb-2 block text-sm">Application *</Label>
        <Select value={appService} onValueChange={setAppService}>
          <SelectTrigger className="bg-nebula-navy border-nebula-navy-lighter text-white">
            <SelectValue placeholder="Select application" />
          </SelectTrigger>
          <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
            <SelectItem value="user-service">User Service</SelectItem>
            <SelectItem value="api-gateway">API Gateway</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-slate-300 mb-2 block text-sm">Service Name *</Label>
        <Input
          value={context}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContext(e.target.value)}
          placeholder="Enter ticket title"
          className="bg-nebula-navy border-nebula-navy-lighter text-white placeholder:text-slate-500"
        />
      </div>

      <div>
        <Label className="text-slate-300 mb-2 block text-sm">Host (Optional)</Label>
        <Select value={host} onValueChange={setHost}>
          <SelectTrigger className="bg-nebula-navy border-nebula-navy-lighter text-white">
            <SelectValue placeholder="Select host" />
          </SelectTrigger>
          <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
            <SelectItem value="prod-web-01">prod-web-01</SelectItem>
            <SelectItem value="prod-web-02">prod-web-02</SelectItem>
            <SelectItem value="prod-api-01">prod-api-01</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-slate-300 mb-2 block text-sm">Description *</Label>
        <Textarea
          value={description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
          placeholder="Describe the service management request (add, remove, modify)..."
          className="bg-nebula-navy border-nebula-navy-lighter text-white placeholder:text-slate-500 min-h-24"
        />
      </div>

      <div>
        <Label className="text-slate-300 mb-2 block text-sm">Reason *</Label>
        <Textarea
          value={reasonRequest}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReasonRequest(e.target.value)}
          placeholder="Why is this service change needed?"
          className="bg-nebula-navy border-nebula-navy-lighter text-white placeholder:text-slate-500"
        />
      </div>
    </div>
  );
}

// Access Request Form
function AccessRequestForm({ description, setDescription, reasonRequest, setReasonRequest }: any) {
  const [resourceType, setResourceType] = useState('');
  const [appService, setAppService] = useState('');
  const [accessLevel, setAccessLevel] = useState('');

  return (
    <div className="space-y-4 p-4 bg-nebula-navy-dark rounded-lg border border-nebula-navy-lighter">
      <h3 className="text-sm font-semibold text-white">Access Request Details</h3>

      <div>
        <Label className="text-slate-300 mb-2 block text-sm">Resource Type *</Label>
        <Select value={resourceType} onValueChange={setResourceType}>
          <SelectTrigger className="bg-nebula-navy border-nebula-navy-lighter text-white">
            <SelectValue placeholder="Select resource type" />
          </SelectTrigger>
          <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
            <SelectItem value="logs">Logs</SelectItem>
            <SelectItem value="metrics">Metrics</SelectItem>
            <SelectItem value="alerts">Alerts Configuration</SelectItem>
            <SelectItem value="dashboard">Dashboard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-slate-300 mb-2 block text-sm">Application / Service *</Label>
        <Select value={appService} onValueChange={setAppService}>
          <SelectTrigger className="bg-nebula-navy border-nebula-navy-lighter text-white">
            <SelectValue placeholder="Select application or service" />
          </SelectTrigger>
          <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
            <SelectItem value="user-service">User Service</SelectItem>
            <SelectItem value="auth-service">Auth Service</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-slate-300 mb-2 block text-sm">Access Level *</Label>
        <Select value={accessLevel} onValueChange={setAccessLevel}>
          <SelectTrigger className="bg-nebula-navy border-nebula-navy-lighter text-white">
            <SelectValue placeholder="Select access level" />
          </SelectTrigger>
          <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
            <SelectItem value="read">Read Only</SelectItem>
            <SelectItem value="write">Read & Write</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-slate-300 mb-2 block text-sm">Description *</Label>
        <Textarea
          value={description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
          placeholder="Describe what access you need and why..."
          className="bg-nebula-navy border-nebula-navy-lighter text-white placeholder:text-slate-500 min-h-24"
        />
      </div>

      <div>
        <Label className="text-slate-300 mb-2 block text-sm">Business Justification *</Label>
        <Textarea
          value={reasonRequest}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReasonRequest(e.target.value)}
          placeholder="Explain the business need for this access..."
          className="bg-nebula-navy border-nebula-navy-lighter text-white placeholder:text-slate-500"
        />
      </div>
    </div>
  );
}

// Incident Follow-up Form
function IncidentFollowupForm({ description, setDescription, reasonRequest, setReasonRequest }: any) {
  const [incident, setIncident] = useState('');
  const [actionType, setActionType] = useState('');

  return (
    <div className="space-y-4 p-4 bg-nebula-navy-dark rounded-lg border border-nebula-navy-lighter">
      <h3 className="text-sm font-semibold text-white">Incident Follow-up Details</h3>

      <div>
        <Label className="text-slate-300 mb-2 block text-sm">Link Incident *</Label>
        <Select value={incident} onValueChange={setIncident}>
          <SelectTrigger className="bg-nebula-navy border-nebula-navy-lighter text-white">
            <SelectValue placeholder="Select incident" />
          </SelectTrigger>
          <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
            <SelectItem value="INC-342">INC-342 - High CPU utilization</SelectItem>
            <SelectItem value="INC-341">INC-341 - Memory leak in API</SelectItem>
            <SelectItem value="INC-339">INC-339 - Auth error rate spike</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-slate-300 mb-2 block text-sm">Follow-up Action *</Label>
        <Select value={actionType} onValueChange={setActionType}>
          <SelectTrigger className="bg-nebula-navy border-nebula-navy-lighter text-white">
            <SelectValue placeholder="Select action type" />
          </SelectTrigger>
          <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
            <SelectItem value="root-cause">Root Cause Analysis</SelectItem>
            <SelectItem value="prevention">Prevention Measures</SelectItem>
            <SelectItem value="monitoring">Additional Monitoring</SelectItem>
            <SelectItem value="review">Post-Incident Review</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-slate-300 mb-2 block text-sm">Description *</Label>
        <Textarea
          value={description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
          placeholder="Describe the follow-up actions needed..."
          className="bg-nebula-navy border-nebula-navy-lighter text-white placeholder:text-slate-500 min-h-24"
        />
      </div>

      <div>
        <Label className="text-slate-300 mb-2 block text-sm">Expected Outcome *</Label>
        <Textarea
          value={reasonRequest}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReasonRequest(e.target.value)}
          placeholder="What outcome do you expect from this follow-up?"
          className="bg-nebula-navy border-nebula-navy-lighter text-white placeholder:text-slate-500"
        />
      </div>
    </div>
  );
}

// General Inquiry Form
function GeneralInquiryForm({ description, setDescription }: any) {
  const [inquiryCategory, setInquiryCategory] = useState('');

  return (
    <div className="space-y-4 p-4 bg-nebula-navy-dark rounded-lg border border-nebula-navy-lighter">
      <h3 className="text-sm font-semibold text-white">General Inquiry Details</h3>

      <div>
        <Label className="text-slate-300 mb-2 block text-sm">Inquiry Category *</Label>
        <Select value={inquiryCategory} onValueChange={setInquiryCategory}>
          <SelectTrigger className="bg-nebula-navy border-nebula-navy-lighter text-white">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
            <SelectItem value="metrics">System Metrics</SelectItem>
            <SelectItem value="reports">Reports & Analytics</SelectItem>
            <SelectItem value="documentation">Documentation</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-slate-300 mb-2 block text-sm">Question / Inquiry *</Label>
        <Textarea
          value={description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
          placeholder="What would you like to know?"
          className="bg-nebula-navy border-nebula-navy-lighter text-white placeholder:text-slate-500 min-h-32"
        />
      </div>
    </div>
  );
}

// Ticket Details Modal
function TicketDetailsModal({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case 'open':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'in-review':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'approved':
        return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'rejected':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'resolved':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const getPriorityColor = (priority: TicketPriority) => {
    switch (priority) {
      case 'high':
        return 'text-red-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-blue-400';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="bg-nebula-navy-light border-nebula-navy-lighter w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6 pb-5 border-b border-nebula-navy-lighter">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-base font-mono font-semibold text-nebula-cyan tracking-wider mr-1.5">{ticket.id}</span>
                <span className={`px-2.5 py-0.5 rounded text-xs font-medium border ${getStatusColor(ticket.status)}`}>
                  {ticket.status.replace('-', ' ').toUpperCase()}
                </span>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">{ticket.purpose}</h2>
              <div className="text-xs text-slate-400">
                <span>Created {ticket.created}</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400 hover:text-white -mr-2 -mt-1">
              <XCircle className="size-5" />
            </Button>
          </div>

          {/* Key Information */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 mb-5 bg-nebula-navy-dark/60 rounded-lg border border-nebula-navy-lighter/60">
            <div>
              <span className="text-slate-400 text-xs font-medium uppercase tracking-wider block mb-1">Purpose</span>
              <p className="text-white text-sm font-medium truncate" title={ticket.purpose}>{ticket.purpose || '—'}</p>
            </div>
            <div>
              <span className="text-slate-400 text-xs font-medium uppercase tracking-wider block mb-1">Requester</span>
              <p className="text-white text-sm font-medium">{ticket.requester}</p>
              <p className="text-xs text-slate-500">{ticket.role}</p>
            </div>
            <div>
              <span className="text-slate-400 text-xs font-medium uppercase tracking-wider block mb-1">Priority</span>
              <p className={`text-sm font-medium capitalize ${getPriorityColor(ticket.priority)}`}>{ticket.priority}</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2 block">Description</Label>
            <div className="p-4 bg-nebula-navy-dark rounded-lg border border-nebula-navy-lighter text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
              {ticket.description || 'No description provided.'}
            </div>
          </div>

          {/* Requested Change */}
          {ticket.requestedChange && (
            <div className="mt-5">
              <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2 block">Requested Change</Label>
              <div className="p-3.5 bg-nebula-purple/10 rounded-lg border border-nebula-purple/30 text-sm text-nebula-purple">
                {ticket.requestedChange}
              </div>
            </div>
          )}

          {/* Reason */}
          {ticket.reason && (
            <div className="mt-5">
              <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2 block">Reason</Label>
              <div className="p-4 bg-nebula-navy-dark rounded-lg border border-nebula-navy-lighter text-sm text-slate-200">
                {ticket.reason}
              </div>
            </div>
          )}

          {/* Linked Incident */}
          {ticket.linkedIncident && (
            <div className="mt-5">
              <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2 block">Linked Incident</Label>
              <div className="p-2.5 bg-red-500/10 rounded-lg border border-red-500/30 inline-block text-xs font-mono text-red-400">
                {ticket.linkedIncident}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}