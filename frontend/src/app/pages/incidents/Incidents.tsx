import { useState, useEffect } from 'react';
import { AlertTriangle, Search, Clock, User, CheckCircle, Eye, UserPlus, Activity, Lightbulb, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import * as incidentApi from '../../../api/incidentApi';
import { fetchRecommendation } from '../../../api/incidentApi';
import { useLiveIncidents } from '../../hooks/useLiveIncidents';

// Shape returned by the backend API
interface ApiIncident {
  incident_id: string;
  incident_number: number;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'acknowledged' | 'resolved';
  assigned_to: string | null;
  assigned_email: string | null;
  created_at: string;
  updated_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  ai_recommendation?: {
    cause: string;
    actions: string[];
    impact: string;
    confidence: 'High' | 'Medium' | 'Low';
  } | null;
  anomalies?: Array<{ title: string; anomaly_type: string; detected_at: string }>;
  timeline?: Array<{ occurred_at: string; message: string; event_type: string }>;
}

interface Engineer {
  id: string;
  email: string;
  role: string;
}

function mapIncident(raw: ApiIncident): any {
  if (!raw) return null;
  const createdAt = raw.created_at ? new Date(raw.created_at) : new Date();
  const validCreated = !isNaN(createdAt.getTime()) ? createdAt : new Date();

  return {
    id: `INC-${raw.incident_number || '000'}`,
    incident_id: raw.incident_id,
    title: raw.title || 'Untitled Incident',
    severity: raw.severity || 'medium',
    status: raw.status || 'open',
    assignedTo: raw.assigned_email ?? 'Unassigned',
    detectedAt: validCreated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    duration: raw.resolved_at
      ? `${Math.round((new Date(raw.resolved_at).getTime() - validCreated.getTime()) / 60000)}m`
      : `${Math.round((Date.now() - validCreated.getTime()) / 60000)}m`,
    entity: (raw.anomalies?.[0]?.anomaly_type ?? 'System') + ' anomaly',
    anomalies: raw.anomalies?.map((a) => `${a.anomaly_type} anomaly`) ?? [],
    hasRecommendation: !!raw.ai_recommendation,
    recommendation: raw.ai_recommendation ?? null,
    timeline: raw.timeline?.map((t) => ({
      time: new Date(t.occurred_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      event: t.message,
    })) ?? [],
  };
}

const DEFAULT_ENGINEERS: Engineer[] = [
  { id: '1', email: 'alex.dev@cloudsight.io', role: 'Senior Site Reliability Engineer' },
  { id: '2', email: 'sarah.ops@cloudsight.io', role: 'DevOps Lead' },
  { id: '3', email: 'david.infra@cloudsight.io', role: 'Infrastructure Specialist' },
  { id: '4', email: 'emily.sec@cloudsight.io', role: 'Security Analyst' }
];

export function Incidents({ selectedIncidentId, selectionEpoch }: { selectedIncidentId?: string; selectionEpoch?: number } = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedEngineer, setSelectedEngineer] = useState('');
  const [engineers, setEngineers] = useState<Engineer[]>(DEFAULT_ENGINEERS);
  const [isRegeneratingRec, setIsRegeneratingRec] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);

  // Load incidents and engineers from the real API on mount
  const [incidents, setIncidents] = useState<any[]>([]);

  // Real-time incident events
  const { newIncident, updatedIncident } = useLiveIncidents();

  const loadData = async () => {
    try {
      const [rawIncidents, rawEngineers] = await Promise.all([
        incidentApi.fetchIncidents(),
        incidentApi.fetchEngineers(),
      ]);
      const safeIncidents = Array.isArray(rawIncidents) ? rawIncidents : [];
      const safeEngineers = Array.isArray(rawEngineers) ? rawEngineers : [];
      setIncidents(safeIncidents.map(mapIncident).filter(Boolean));
      setEngineers(safeEngineers.length > 0 ? safeEngineers : DEFAULT_ENGINEERS);
    } catch (err) {
      console.error('Failed to load incidents:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Auto-open incident detail when navigated via notification
  useEffect(() => {
    if (!selectedIncidentId) return;
    incidentApi.fetchIncidentById(selectedIncidentId)
      .then((raw) => {
        if (raw) {
          setSelectedIncident(mapIncident(raw));
        }
      })
      .catch((err) => {
        console.error('Failed to fetch incident from notification:', err);
      });
  }, [selectedIncidentId, selectionEpoch]);

  // Live: prepend newly created incidents
  useEffect(() => {
    if (!newIncident || !newIncident.incident_id) return;

    setIncidents(prev => {
      if (prev.some(i => i.incident_id === newIncident.incident_id)) return prev;
      return [mapIncident(newIncident as any), ...prev];
    });
  }, [newIncident]);

  // Live: update incident status/assignment in-place
  useEffect(() => {
    if (!updatedIncident || !updatedIncident.incident_id) return;

    setIncidents(prev =>
      prev.map(i =>
        i.incident_id === updatedIncident.incident_id
          ? {
              ...i,
              status: updatedIncident.status || i.status,
              assignedTo: updatedIncident.assigned_email || i.assignedTo,
            }
          : i
      )
    );

    // If the detail dialog is open for this incident, refresh it
    if (selectedIncident?.incident_id === updatedIncident.incident_id) {
      incidentApi.fetchIncidentById(updatedIncident.incident_id as string)
        .then(updated => setSelectedIncident(mapIncident(updated)))
        .catch(() => {});
    }
  }, [updatedIncident]);



  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const filteredIncidents = incidents.filter(incident =>
    (incident.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (incident.id?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (incident.entity?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (incident.assignedTo?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredIncidents.length / pageSize));
  const paginatedIncidents = filteredIncidents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'high':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'low':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-500/10 text-blue-400';
      case 'acknowledged':
        return 'bg-purple-500/10 text-purple-400';
      case 'resolved':
        return 'bg-green-500/10 text-green-400';
      default:
        return 'bg-slate-500/10 text-slate-400';
    }
  };

  const handleAssign = async () => {
    if (selectedIncident && selectedEngineer) {
      try {
        await incidentApi.assignEngineer(selectedIncident.incident_id, selectedEngineer);
        setIsAssignDialogOpen(false);
        setSelectedEngineer('');
        await loadData();
        // Update selected incident details
        const updated = await incidentApi.fetchIncidentById(selectedIncident.incident_id);
        setSelectedIncident(mapIncident(updated));
      } catch (err) {
        console.error('Failed to assign engineer', err);
        alert('Failed to assign engineer. Make sure you have admin rights.');
      }
    }
  };

  const handleAcknowledge = async (incident: any) => {
    try {
      await incidentApi.acknowledgeIncident(incident.incident_id);
      await loadData();
      if (selectedIncident?.id === incident.id) {
        const updated = await incidentApi.fetchIncidentById(incident.incident_id);
        setSelectedIncident(mapIncident(updated));
      }
    } catch (err) {
      console.error('Failed to acknowledge incident', err);
    }
  };

  const handleResolve = async (incident: any) => {
    try {
      await incidentApi.resolveIncident(incident.incident_id);
      await loadData();
      if (selectedIncident?.id === incident.id) {
        setSelectedIncident(null);
      }
    } catch (err) {
      console.error('Failed to resolve incident', err);
    }
  };

  const handleRegenerateRecommendation = async () => {
    if (!selectedIncident) return;
    setIsRegeneratingRec(true);
    setRecError(null);
    try {
      const recommendation = await fetchRecommendation(selectedIncident.incident_id);
      if (!recommendation || typeof recommendation !== 'object') {
        throw new Error('Invalid response from server');
      }
      setSelectedIncident((prev: any) => ({
        ...prev,
        hasRecommendation: true,
        recommendation,
      }));
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to generate recommendation';
      console.error('Recommendation error:', msg);
      setRecError(msg);
    } finally {
      setIsRegeneratingRec(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Incidents</h1>
        <p className="text-slate-400 text-sm mt-1">Manage and respond to system incidents</p>
      </div>

      {/* Search */}
      <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              placeholder="Search incidents by ID, title, entity, or assignee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-nebula-navy-dark border-nebula-navy-lighter text-white placeholder:text-slate-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Incidents List */}
      <div className="space-y-4">
        {filteredIncidents.length === 0 ? (
          <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
            <CardContent className="p-12 text-center">
              <AlertTriangle className="size-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No incidents found.</p>
            </CardContent>
          </Card>
        ) : (
          paginatedIncidents.map((incident) => (
            <Card
              key={incident.id}
              className="bg-nebula-navy-light border-nebula-navy-lighter hover:border-nebula-purple/30 transition-all"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Header */}
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        incident.severity === 'critical' ? 'bg-red-500/10' : 
                        incident.severity === 'high' ? 'bg-orange-500/10' : 
                        'bg-yellow-500/10'
                      }`}>
                        <AlertTriangle className={`size-5 ${
                          incident.severity === 'critical' ? 'text-red-400' : 
                          incident.severity === 'high' ? 'text-orange-400' : 
                          'text-yellow-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-mono text-slate-400">{incident.id}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getSeverityColor(incident.severity)}`}>
                            {incident.severity.toUpperCase()}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(incident.status)}`}>
                            {incident.status}
                          </span>
                          {incident.hasRecommendation && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-400 flex items-center gap-1">
                              <Lightbulb className="size-3" />
                              Recommendation Available
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-1">{incident.title}</h3>
                        <p className="text-sm text-slate-400">{incident.entity}</p>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-6 text-sm text-slate-400">
                      <div className="flex items-center gap-2">
                        <Clock className="size-4" />
                        <span>Detected: {incident.detectedAt} ({incident.duration})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="size-4" />
                        <span className={incident.assignedTo === 'Unassigned' ? 'text-slate-500' : 'text-slate-300'}>
                          {incident.assignedTo}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedIncident(incident);
                        setIsAssignDialogOpen(true);
                      }}
                      className="bg-transparent border-nebula-purple text-nebula-purple hover:bg-nebula-purple/10"
                    >
                      <UserPlus className="size-4 mr-2" />
                      {incident.assignedTo === 'Unassigned' ? 'Assign' : 'Reassign'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          const fullIncident = await incidentApi.fetchIncidentById(incident.incident_id);
                          setSelectedIncident(mapIncident(fullIncident));
                        } catch (err) {
                          console.error('Failed to fetch details', err);
                        }
                      }}
                      className="bg-transparent border-nebula-navy-lighter text-white hover:bg-nebula-navy-lighter"
                    >
                      <Eye className="size-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {filteredIncidents.length > 0 && (
        <div className="flex items-center justify-between border-t border-nebula-navy-lighter pt-4 px-2">
          <p className="text-xs text-slate-400">
            Showing <span className="font-semibold text-white">{(currentPage - 1) * pageSize + 1}</span> to{' '}
            <span className="font-semibold text-white">
              {Math.min(currentPage * pageSize, filteredIncidents.length)}
            </span>{' '}
            of <span className="font-semibold text-white">{filteredIncidents.length}</span> incidents
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="bg-transparent border-nebula-navy-lighter text-white hover:bg-nebula-navy-lighter disabled:opacity-40"
            >
              Previous
            </Button>
            <span className="text-xs text-slate-400 px-2">
              Page <span className="text-white font-medium">{currentPage}</span> of{' '}
              <span className="text-white font-medium">{totalPages}</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="bg-transparent border-nebula-navy-lighter text-white hover:bg-nebula-navy-lighter disabled:opacity-40"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Incident Details Dialog */}
      <Dialog open={!!selectedIncident && !isAssignDialogOpen} onOpenChange={(open) => !open && setSelectedIncident(null)}>
        <DialogContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedIncident && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span className="text-xl">{selectedIncident.id}: {selectedIncident.title}</span>
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  Incident details, recommendations, and timeline
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Incident Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-400">Severity</Label>
                    <div className="mt-1">
                      <span className={`px-3 py-1 rounded text-sm font-medium border ${getSeverityColor(selectedIncident.severity)}`}>
                        {selectedIncident.severity.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-400">Status</Label>
                    <div className="mt-1">
                      <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(selectedIncident.status)}`}>
                        {selectedIncident.status}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-400">Detected at</Label>
                    <p className="text-white mt-1">{selectedIncident.detectedAt}</p>
                  </div>
                  <div>
                    <Label className="text-slate-400">Duration</Label>
                    <p className="text-white mt-1">{selectedIncident.duration}</p>
                  </div>
                </div>

                {/* Assignment & Status */}
                <Card className="bg-nebula-navy-dark border-nebula-navy-lighter">
                  <CardContent className="p-4">
                    <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <User className="size-4" />
                      Assignment & Status
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-slate-400">Assigned Engineer</Label>
                          <p className="text-white mt-1">{selectedIncident.assignedTo}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsAssignDialogOpen(true)}
                          className="bg-transparent border-nebula-purple text-nebula-purple hover:bg-nebula-purple/10"
                        >
                          {selectedIncident.assignedTo === 'Unassigned' ? 'Assign' : 'Reassign'}
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        {selectedIncident.status === 'open' && (
                          <Button
                            onClick={() => handleAcknowledge(selectedIncident)}
                            disabled={selectedIncident.assignedTo === 'Unassigned'}
                            className="flex-1 bg-gradient-to-r from-nebula-cyan to-nebula-blue hover:from-nebula-cyan-dark hover:to-nebula-blue text-white disabled:opacity-50"
                          >
                            <CheckCircle className="size-4 mr-2" />
                            Acknowledge
                          </Button>
                        )}
                        {selectedIncident.status !== 'resolved' && (
                          <Button
                            onClick={() => handleResolve(selectedIncident)}
                            disabled={selectedIncident.assignedTo === 'Unassigned'}
                            className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white disabled:opacity-50"
                          >
                            <CheckCircle className="size-4 mr-2" />
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Triggered Anomalies */}
                <Card className="bg-nebula-navy-dark border-nebula-navy-lighter">
                  <CardContent className="p-4">
                    <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <Activity className="size-4" />
                      Triggered Anomalies
                    </h4>
                    <div className="space-y-2">
                      {selectedIncident.anomalies.map((anomaly: any, index: number) => (
                        <div key={index} className="p-2 bg-nebula-navy-light rounded text-sm text-slate-300">
                          • {anomaly}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* AI Recommendation */}
                <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-white font-semibold flex items-center gap-2">
                        <Lightbulb className="size-5 text-purple-400" />
                        AI-Powered Recommendation
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRegenerateRecommendation}
                        disabled={isRegeneratingRec}
                        className="bg-transparent border-purple-500/40 text-purple-300 hover:bg-purple-500/10 text-xs h-7 px-3"
                      >
                        {isRegeneratingRec ? (
                          <>
                            <Activity className="size-3 mr-1 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <TrendingUp className="size-3 mr-1" />
                            {selectedIncident.hasRecommendation ? 'Regenerate' : 'Generate'}
                          </>
                        )}
                      </Button>
                    </div>

                    {selectedIncident.hasRecommendation && selectedIncident.recommendation ? (
                      <div className="space-y-4">
                        <div>
                          <Label className="text-purple-300 text-xs uppercase tracking-wide">Likely Cause</Label>
                          <p className="text-white mt-1 text-sm leading-relaxed">{selectedIncident.recommendation.cause}</p>
                        </div>
                        <div>
                          <Label className="text-purple-300 text-xs uppercase tracking-wide">Recommended Actions</Label>
                          <ul className="mt-2 space-y-2">
                            {(selectedIncident.recommendation.actions ?? []).map((action: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-slate-200">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-500/30 text-purple-300 text-xs flex items-center justify-center font-semibold mt-0.5">
                                  {idx + 1}
                                </span>
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-purple-300 text-xs uppercase tracking-wide">Expected Impact</Label>
                            <p className="text-green-400 font-medium mt-1 flex items-start gap-1 text-sm">
                              <TrendingUp className="size-4 flex-shrink-0 mt-0.5" />
                              <span>{selectedIncident.recommendation.impact}</span>
                            </p>
                          </div>
                          <div>
                            <Label className="text-purple-300 text-xs uppercase tracking-wide">Confidence</Label>
                            <p className="text-white mt-1">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                selectedIncident.recommendation.confidence === 'High'
                                  ? 'bg-green-500/20 text-green-400'
                                  : selectedIncident.recommendation.confidence === 'Medium'
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : 'bg-slate-500/20 text-slate-400'
                              }`}>
                                {selectedIncident.recommendation.confidence}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Lightbulb className="size-8 text-purple-500/40 mx-auto mb-2" />
                        {recError ? (
                          <>
                            <p className="text-red-400 text-sm font-medium">Generation failed</p>
                            <p className="text-red-400/70 text-xs mt-1 max-w-xs mx-auto break-words">{recError}</p>
                            <p className="text-slate-500 text-xs mt-2">Check backend logs for details, then try again.</p>
                          </>
                        ) : (
                          <>
                            <p className="text-slate-400 text-sm">No recommendation yet.</p>
                            <p className="text-slate-500 text-xs mt-1">Click Generate to create an AI-powered recommendation for this incident.</p>
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Activity Timeline */}
                <Card className="bg-nebula-navy-dark border-nebula-navy-lighter">
                  <CardContent className="p-4">
                    <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <Clock className="size-4" />
                      Activity Timeline
                    </h4>
                    <div className="space-y-3">
                      {selectedIncident.timeline.map((item: any, index: number) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-nebula-purple rounded-full mt-2"></div>
                          <div className="flex-1">
                            <p className="text-sm text-slate-400">{item.time}</p>
                            <p className="text-white">{item.event}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSelectedIncident(null)}
                  className="bg-transparent border-nebula-navy-lighter text-white hover:bg-nebula-navy-lighter"
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Engineer Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Engineer to Incident</DialogTitle>
            <DialogDescription className="text-slate-400">
              Select an engineer to handle this incident
            </DialogDescription>
          </DialogHeader>

          {selectedIncident && (
            <div className="py-4 space-y-4">
              {/* Incident Info */}
              <div className="p-4 bg-nebula-navy-dark rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono text-slate-400">{selectedIncident.id}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getSeverityColor(selectedIncident.severity)}`}>
                    {selectedIncident.severity.toUpperCase()}
                  </span>
                </div>
                <h4 className="text-sm font-medium text-white mb-1">{selectedIncident.title}</h4>
                <p className="text-xs text-slate-400">{selectedIncident.entity}</p>
              </div>

              {/* Engineer Selection */}
              <div className="space-y-2">
                <Label>Select Engineer *</Label>
                <Select value={selectedEngineer} onValueChange={setSelectedEngineer}>
                  <SelectTrigger className="bg-nebula-navy-dark border-nebula-navy-lighter text-white">
                    <SelectValue placeholder="Choose an engineer..." />
                  </SelectTrigger>
                  <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
                    {engineers.map((eng) => (
                      <SelectItem key={eng.id} value={eng.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{eng.email}</span>
                          <span className="text-xs text-slate-400">{eng.role}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Current Assignment */}
              {selectedIncident.assignedTo !== 'Unassigned' && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-xs text-yellow-400">
                    Currently assigned to: <span className="font-medium">{selectedIncident.assignedTo}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsAssignDialogOpen(false)}
              className="bg-transparent border-nebula-navy-lighter text-white hover:bg-nebula-navy-lighter"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedEngineer}
              className="bg-gradient-to-r from-nebula-purple to-nebula-blue hover:from-nebula-purple-dark hover:to-nebula-blue text-white disabled:opacity-50"
            >
              Assign Engineer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
