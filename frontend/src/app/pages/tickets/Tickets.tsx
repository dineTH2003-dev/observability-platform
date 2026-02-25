import { useState } from 'react';
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
  TicketIcon, Plus, Search, Filter, MessageSquare, CheckCircle, 
  XCircle, Clock, AlertCircle, Settings, Users, Key, FileText 
} from 'lucide-react';

type TicketPurpose = 'alert-config' | 'service-management' | 'access-request' | 'incident-followup' | 'general-inquiry' | null;
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

export function Tickets() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const tickets: Ticket[] = [
    {
      id: 'TKT-1042',
      title: 'Enable alerts for User Service',
      purpose: 'Alert Configuration',
      status: 'open',
      priority: 'high',
      requester: 'Alex Kumar',
      role: 'Developer',
      context: 'App: User Service',
      created: '2h ago',
      updated: '2h ago',
      description: 'Need to enable health monitoring alerts for the User Service in production environment.',
      requestedChange: 'Enable Incident + Health + Anomaly alerts',
      reason: 'Recently experienced downtime without proper alerting'
    },
    {
      id: 'TKT-1041',
      title: 'Add new Payment Processing service',
      purpose: 'Service Management',
      status: 'in-review',
      priority: 'medium',
      requester: 'Sarah Chen',
      role: 'Developer',
      context: 'App: Payment Gateway',
      created: '5h ago',
      updated: '1h ago',
      description: 'Request to add new microservice for payment processing under Payment Gateway application.',
      requestedChange: 'Add service: payment-processor-v2',
      reason: 'New feature deployment requiring separate service monitoring'
    },
  ];

  const filteredTickets = tickets.filter(ticket => {
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
    const matchesSearch = 
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.purpose.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

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

      {/* Filters & Search */}
      <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input
                  placeholder="Search tickets by ID, title, or purpose..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-nebula-navy-dark border-nebula-navy-lighter text-white placeholder:text-slate-500"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="bg-nebula-navy-dark border-nebula-navy-lighter text-white">
                  <Filter className="size-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in-review">In Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
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
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Title</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Purpose</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Context</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Priority</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Created</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => (
                  <tr 
                    key={ticket.id} 
                    className="border-b border-nebula-navy-lighter/50 hover:bg-nebula-navy-dark/50 cursor-pointer"
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <td className="py-3 px-4">
                      <span className="text-sm font-mono text-nebula-cyan">{ticket.id}</span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-white font-medium max-w-xs truncate">{ticket.title}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-slate-300">
                        {getPurposeIcon(ticket.purpose)}
                        <span className="text-sm">{ticket.purpose}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-slate-400">{ticket.context}</span>
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
                        onClick={(e) => {
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

          {filteredTickets.length === 0 && (
            <div className="text-center py-12">
              <TicketIcon className="size-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No tickets found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <CreateTicketModal onClose={() => setShowCreateModal(false)} />
      )}

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <TicketDetailsModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}
    </div>
  );
}

// Create Ticket Modal Component
function CreateTicketModal({ onClose }: { onClose: () => void }) {
  const [ticketPurpose, setTicketPurpose] = useState<TicketPurpose>(null);
  const [priority, setPriority] = useState<TicketPriority>('medium');

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
                  <SelectItem value="alert-config">
                    <div className="flex items-center gap-2">
                      <Settings className="size-4" />
                      Alert Configuration Request
                    </div>
                  </SelectItem>
                  <SelectItem value="service-management">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4" />
                      Service / Application Management
                    </div>
                  </SelectItem>
                  <SelectItem value="access-request">
                    <div className="flex items-center gap-2">
                      <Key className="size-4" />
                      Access / Permission Request
                    </div>
                  </SelectItem>
                  <SelectItem value="incident-followup">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="size-4" />
                      Incident Follow-up
                    </div>
                  </SelectItem>
                  <SelectItem value="general-inquiry">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="size-4" />
                      General Inquiry
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Section 2: Dynamic Context Fields */}
            {ticketPurpose === 'alert-config' && (
              <AlertConfigurationForm />
            )}

            {ticketPurpose === 'service-management' && (
              <ServiceManagementForm />
            )}

            {ticketPurpose === 'access-request' && (
              <AccessRequestForm />
            )}

            {ticketPurpose === 'incident-followup' && (
              <IncidentFollowupForm />
            )}

            {ticketPurpose === 'general-inquiry' && (
              <GeneralInquiryForm />
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
                  <Button className="bg-gradient-to-r from-nebula-purple to-nebula-blue hover:from-nebula-purple/90 hover:to-nebula-blue/90 text-white">
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
function AlertConfigurationForm() {
  return (
    <div className="space-y-4 p-4 bg-nebula-navy-dark rounded-lg border border-nebula-navy-lighter">
      <h3 className="text-sm font-semibold text-white">Alert Configuration Details</h3>
      
      <div>
        <Label className="text-slate-300 mb-2 block text-sm">Application *</Label>
        <Select>
          <SelectTrigger className="bg-nebula-navy border-nebula-navy-lighter text-white">
            <SelectValue placeholder="Select application" />
          </SelectTrigger>
          <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
            <SelectItem value="user-service">User Service</SelectItem>
            <SelectItem value="payment-gateway">Payment Gateway</SelectItem>
            <SelectItem value="api-gateway">API Gateway</SelectItem>
            <SelectItem value="auth-service">Auth Service</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-slate-300 mb-2 block text-sm">Environment *</Label>
        <Select>
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
        <Select>
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
          placeholder="Describe your alert configuration request..."
          className="bg-nebula-navy border-nebula-navy-lighter text-white placeholder:text-slate-500 min-h-24"
        />
      </div>

      <div>
        <Label className="text-slate-300 mb-2 block text-sm">Reason for Request *</Label>
        <Textarea
          placeholder="Why is this configuration needed?"
          className="bg-nebula-navy border-nebula-navy-lighter text-white placeholder:text-slate-500"
        />
      </div>
    </div>
  );
}

// Service Management Form
function ServiceManagementForm() {
  return (
    <div className="space-y-4 p-4 bg-nebula-navy-dark rounded-lg border border-nebula-navy-lighter">
      <h3 className="text-sm font-semibold text-white">Service Management Details</h3>
      
      <div>
        <Label className="text-slate-300 mb-2 block text-sm">Application *</Label>
        <Select>
          <SelectTrigger className="bg-nebula-navy border-nebula-navy-lighter text-white">
            <SelectValue placeholder="Select application" />
          </SelectTrigger>
          <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
            <SelectItem value="user-service">User Service</SelectItem>
            <SelectItem value="payment-gateway">Payment Gateway</SelectItem>
            <SelectItem value="api-gateway">API Gateway</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-slate-300 mb-2 block text-sm">Service Name *</Label>
        <Input
          placeholder="e.g., payment-processor-v2"
          className="bg-nebula-navy border-nebula-navy-lighter text-white placeholder:text-slate-500"
        />
      </div>

      <div>
        <Label className="text-slate-300 mb-2 block text-sm">Host (Optional)</Label>
        <Select>
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
          placeholder="Describe the service management request (add, remove, modify)..."
          className="bg-nebula-navy border-nebula-navy-lighter text-white placeholder:text-slate-500 min-h-24"
        />
      </div>

      <div>
        <Label className="text-slate-300 mb-2 block text-sm">Reason *</Label>
        <Textarea
          placeholder="Why is this service change needed?"
          className="bg-nebula-navy border-nebula-navy-lighter text-white placeholder:text-slate-500"
        />
      </div>
    </div>
  );
}

// Access Request Form
function AccessRequestForm() {
  return (
    <div className="space-y-4 p-4 bg-nebula-navy-dark rounded-lg border border-nebula-navy-lighter">
      <h3 className="text-sm font-semibold text-white">Access Request Details</h3>
      
      <div>
        <Label className="text-slate-300 mb-2 block text-sm">Resource Type *</Label>
        <Select>
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
        <Select>
          <SelectTrigger className="bg-nebula-navy border-nebula-navy-lighter text-white">
            <SelectValue placeholder="Select application or service" />
          </SelectTrigger>
          <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
            <SelectItem value="user-service">User Service</SelectItem>
            <SelectItem value="auth-service">Auth Service</SelectItem>
            <SelectItem value="payment-gateway">Payment Gateway</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-slate-300 mb-2 block text-sm">Access Level *</Label>
        <Select>
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
          placeholder="Describe what access you need and why..."
          className="bg-nebula-navy border-nebula-navy-lighter text-white placeholder:text-slate-500 min-h-24"
        />
      </div>

      <div>
        <Label className="text-slate-300 mb-2 block text-sm">Business Justification *</Label>
        <Textarea
          placeholder="Explain the business need for this access..."
          className="bg-nebula-navy border-nebula-navy-lighter text-white placeholder:text-slate-500"
        />
      </div>
    </div>
  );
}

// Incident Follow-up Form
function IncidentFollowupForm() {
  return (
    <div className="space-y-4 p-4 bg-nebula-navy-dark rounded-lg border border-nebula-navy-lighter">
      <h3 className="text-sm font-semibold text-white">Incident Follow-up Details</h3>
      
      <div>
        <Label className="text-slate-300 mb-2 block text-sm">Link Incident *</Label>
        <Select>
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
        <Select>
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
          placeholder="Describe the follow-up actions needed..."
          className="bg-nebula-navy border-nebula-navy-lighter text-white placeholder:text-slate-500 min-h-24"
        />
      </div>

      <div>
        <Label className="text-slate-300 mb-2 block text-sm">Expected Outcome *</Label>
        <Textarea
          placeholder="What outcome do you expect from this follow-up?"
          className="bg-nebula-navy border-nebula-navy-lighter text-white placeholder:text-slate-500"
        />
      </div>
    </div>
  );
}

// General Inquiry Form
function GeneralInquiryForm() {
  return (
    <div className="space-y-4 p-4 bg-nebula-navy-dark rounded-lg border border-nebula-navy-lighter">
      <h3 className="text-sm font-semibold text-white">General Inquiry Details</h3>
      
      <div>
        <Label className="text-slate-300 mb-2 block text-sm">Inquiry Category *</Label>
        <Select>
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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="bg-nebula-navy-light border-nebula-navy-lighter w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6 pb-6 border-b border-nebula-navy-lighter">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-lg font-mono text-nebula-cyan">{ticket.id}</span>
                <span className={`px-3 py-1 rounded text-xs font-medium border ${getStatusColor(ticket.status)}`}>
                  {ticket.status.replace('-', ' ').toUpperCase()}
                </span>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">{ticket.title}</h2>
              <div className="flex items-center gap-4 text-sm text-slate-400">
                <span>Created {ticket.created}</span>
                <span>•</span>
                <span>Updated {ticket.updated}</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400 hover:text-white">
              <XCircle className="size-5" />
            </Button>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <Label className="text-slate-400 text-xs uppercase tracking-wide mb-1 block">Purpose</Label>
              <p className="text-white">{ticket.purpose}</p>
            </div>
            <div>
              <Label className="text-slate-400 text-xs uppercase tracking-wide mb-1 block">Context</Label>
              <p className="text-white">{ticket.context}</p>
            </div>
            <div>
              <Label className="text-slate-400 text-xs uppercase tracking-wide mb-1 block">Requester</Label>
              <p className="text-white">{ticket.requester}</p>
              <p className="text-xs text-slate-500">{ticket.role}</p>
            </div>
            <div>
              <Label className="text-slate-400 text-xs uppercase tracking-wide mb-1 block">Priority</Label>
              <p className="text-white capitalize">{ticket.priority}</p>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <Label className="text-slate-400 text-xs uppercase tracking-wide mb-2 block">Description</Label>
            <div className="p-4 bg-nebula-navy-dark rounded-lg border border-nebula-navy-lighter">
              <p className="text-white text-sm">{ticket.description}</p>
            </div>
          </div>

          {/* Requested Change */}
          {ticket.requestedChange && (
            <div className="mb-6">
              <Label className="text-slate-400 text-xs uppercase tracking-wide mb-2 block">Requested Change</Label>
              <div className="p-4 bg-nebula-purple/10 rounded-lg border border-nebula-purple/30">
                <p className="text-nebula-purple font-medium text-sm">{ticket.requestedChange}</p>
              </div>
            </div>
          )}

          {/* Reason */}
          {ticket.reason && (
            <div className="mb-6">
              <Label className="text-slate-400 text-xs uppercase tracking-wide mb-2 block">Reason</Label>
              <div className="p-4 bg-nebula-navy-dark rounded-lg border border-nebula-navy-lighter">
                <p className="text-white text-sm">{ticket.reason}</p>
              </div>
            </div>
          )}

          {/* Linked Incident */}
          {ticket.linkedIncident && (
            <div className="mb-6">
              <Label className="text-slate-400 text-xs uppercase tracking-wide mb-2 block">Linked Incident</Label>
              <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/30 inline-block">
                <span className="text-red-400 font-mono text-sm">{ticket.linkedIncident}</span>
              </div>
            </div>
          )}

          {/* Admin Actions */}
          <div className="flex gap-3 pt-6 border-t border-nebula-navy-lighter">
            <Button
              variant="outline"
              className="flex-1 border-green-500/30 text-green-400 hover:bg-green-500/10"
            >
              <CheckCircle className="size-4 mr-2" />
              Approve
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <XCircle className="size-4 mr-2" />
              Reject
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
            >
              <Clock className="size-4 mr-2" />
              Mark In Review
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-nebula-purple to-nebula-blue hover:from-nebula-purple/90 hover:to-nebula-blue/90 text-white"
            >
              <CheckCircle className="size-4 mr-2" />
              Resolve
            </Button>
          </div>

          {/* Comment Section */}
          <div className="mt-6 pt-6 border-t border-nebula-navy-lighter">
            <Label className="text-white mb-2 block">Add Comment</Label>
            <Textarea
              placeholder="Add a comment or update..."
              className="bg-nebula-navy-dark border-nebula-navy-lighter text-white placeholder:text-slate-500 mb-3"
            />
            <Button
              size="sm"
              className="bg-nebula-navy-dark border border-nebula-navy-lighter text-white hover:bg-nebula-navy"
            >
              <MessageSquare className="size-4 mr-2" />
              Post Comment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}