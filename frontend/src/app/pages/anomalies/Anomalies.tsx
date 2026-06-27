import { useEffect, useState } from 'react';
import { Search, AlertTriangle, Check, X, Clock, Fingerprint } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { addAnomalyFeedback, fetchAnomalies, fetchAnomalyById } from '../../../api/anomalyApi';
import type { ApiAnomaly } from '../../../api/anomalyApi';

type FeedbackLabel = 'true_positive' | 'false_positive' | 'expected_change' | 'duplicate' | 'unknown';

interface Anomaly {
    id: string;
    severity: string;
    entity: string;
    type: string;
    title: string;
    description?: string | null;
    detectedTime: string;
    assignedTime?: string;
    acknowledgedTime?: string;
    resolvedTime?: string;
    status: 'detected' | 'assigned' | 'acknowledged' | 'resolved';
    detector?: string | null;
    metricValue?: string;
    threshold?: string;
    score?: string;
    confidence?: string;
    reasonCodes?: string[];
    incidentNumber?: number | null;
    suppressionReason?: string | null;
}

interface AnomaliesProps {
    selectedAnomalyId?: string;
}

function toAnomaly(row: ApiAnomaly): Anomaly {
    const entity = row.service_name
        ? `${row.server_name || 'Server'} / ${row.service_name}`
        : row.application_name
            ? row.application_name
            : row.server_name || `Server ${row.server_id || ''}`.trim();

    const type = row.service_id ? 'Service' : row.application_id ? 'Application' : 'Host';
    const detectedTime = formatRelativeTime(row.detected_at);

    return {
        id: row.anomaly_id,
        severity: row.severity,
        entity,
        type,
        title: row.title,
        description: row.description,
        detectedTime,
        assignedTime: ['assigned', 'acknowledged', 'resolved'].includes(row.status) ? detectedTime : undefined,
        acknowledgedTime: ['acknowledged', 'resolved'].includes(row.status) ? detectedTime : undefined,
        resolvedTime: row.resolved_at ? formatRelativeTime(row.resolved_at) : undefined,
        status: row.status,
        detector: row.detector_name,
        metricValue: formatNumber(row.metric_value),
        threshold: formatNumber(row.threshold || row.upper_bound),
        score: formatNumber(row.score),
        confidence: formatNumber(row.confidence),
        reasonCodes: row.reason_codes || [],
        incidentNumber: row.incident_number,
        suppressionReason: row.suppression_reason,
    };
}

function formatNumber(value?: number | string | null) {
    if (value === null || value === undefined) return undefined;
    const numberValue = Number(value);
    if (Number.isNaN(numberValue)) return String(value);
    return numberValue.toFixed(2);
}

function formatRelativeTime(value: string) {
    const then = new Date(value).getTime();
    const diffMs = Date.now() - then;
    const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

    if (diffMinutes < 1) return 'now';
    if (diffMinutes < 60) return `${diffMinutes}m`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ${diffMinutes % 60}m`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ${diffHours % 24}h`;
}

function formatDateTime(value?: string | null) {
    if (!value) return 'N/A';
    return new Date(value).toLocaleString();
}

function labelText(label: string) {
    return label.replace(/_/g, ' ');
}

export function Anomalies({ selectedAnomalyId }: AnomaliesProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAnomaly, setSelectedAnomaly] = useState<string | null>(selectedAnomalyId || null);
    const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
    const [selectedDetail, setSelectedDetail] = useState<ApiAnomaly | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        fetchAnomalies()
            .then((rows) => {
                if (!mounted) return;
                setAnomalies(rows.map(toAnomaly));
                setError(null);
            })
            .catch((err) => {
                if (!mounted) return;
                setError(err instanceof Error ? err.message : 'Failed to load anomalies');
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (!selectedAnomaly) {
            setSelectedDetail(null);
            return;
        }

        let mounted = true;
        setDetailLoading(true);
        fetchAnomalyById(selectedAnomaly)
            .then((detail) => {
                if (mounted) setSelectedDetail(detail);
            })
            .catch((err) => {
                if (!mounted) return;
                setError(err instanceof Error ? err.message : 'Failed to load anomaly details');
                setSelectedDetail(null);
            })
            .finally(() => {
                if (mounted) setDetailLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [selectedAnomaly]);

    const filteredAnomalies = anomalies.filter(anomaly =>
        anomaly.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        anomaly.entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        anomaly.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
        anomaly.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (anomaly.detector || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical':
                return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'high':
                return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
            case 'medium':
                return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
            default:
                return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'detected':
                return 'bg-blue-500/10 text-blue-400';
            case 'assigned':
                return 'bg-purple-500/10 text-purple-400';
            case 'acknowledged':
                return 'bg-orange-500/10 text-orange-400';
            case 'resolved':
                return 'bg-green-500/10 text-green-400';
            default:
                return 'bg-slate-500/10 text-slate-400';
        }
    };

    const submitFeedback = async (anomalyId: string, label: FeedbackLabel) => {
        await addAnomalyFeedback(anomalyId, label);
        const [detail, rows] = await Promise.all([
            fetchAnomalyById(anomalyId),
            fetchAnomalies(),
        ]);
        setSelectedDetail(detail);
        setAnomalies(rows.map(toAnomaly));
    };

    const featureEntries = selectedDetail?.feature_values
        ? Object.entries(selectedDetail.feature_values).slice(0, 12)
        : [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold text-white">Anomalies</h1>
                <p className="text-slate-400 text-sm mt-1">AI-powered anomaly detection and analysis</p>
            </div>

            {/* Search */}
            <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
                <CardContent className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <Input
                            placeholder="Search anomalies by title, entity, status..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-nebula-navy-dark border-nebula-navy-lighter text-white placeholder:text-slate-500"
                        />
                    </div>
                </CardContent>
            </Card>

            {selectedAnomaly && (
                <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
                    <CardContent className="p-6">
                        {detailLoading ? (
                            <p className="text-slate-400">Loading anomaly details...</p>
                        ) : selectedDetail ? (
                            <div className="space-y-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getSeverityColor(selectedDetail.severity)}`}>
                                                {selectedDetail.severity.toUpperCase()}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(selectedDetail.status)}`}>
                                                {selectedDetail.status}
                                            </span>
                                            {selectedDetail.detector_name && (
                                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-400">
                                                    {selectedDetail.detector_name}
                                                </span>
                                            )}
                                        </div>
                                        <h2 className="text-xl font-semibold text-white">{selectedDetail.title}</h2>
                                        {selectedDetail.description && (
                                            <p className="text-sm text-slate-400 mt-1">{selectedDetail.description}</p>
                                        )}
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setSelectedAnomaly(null);
                                            setSelectedDetail(null);
                                        }}
                                        className="bg-transparent border-nebula-navy-lighter text-white hover:bg-nebula-navy-lighter"
                                    >
                                        Close
                                    </Button>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                    <div className="rounded border border-nebula-navy-lighter bg-nebula-navy-dark p-3">
                                        <p className="text-xs text-slate-500">Entity</p>
                                        <p className="text-sm text-white mt-1">
                                            {selectedDetail.service_name
                                                ? `${selectedDetail.server_name || 'Server'} / ${selectedDetail.service_name}`
                                                : selectedDetail.application_name || selectedDetail.server_name || 'N/A'}
                                        </p>
                                    </div>
                                    <div className="rounded border border-nebula-navy-lighter bg-nebula-navy-dark p-3">
                                        <p className="text-xs text-slate-500">Metric</p>
                                        <p className="text-sm text-white mt-1">
                                            {selectedDetail.anomaly_type} {formatNumber(selectedDetail.metric_value) || 'N/A'}
                                        </p>
                                    </div>
                                    <div className="rounded border border-nebula-navy-lighter bg-nebula-navy-dark p-3">
                                        <p className="text-xs text-slate-500">Normal Range</p>
                                        <p className="text-sm text-white mt-1">
                                            {formatNumber(selectedDetail.lower_bound) || 'N/A'} - {formatNumber(selectedDetail.upper_bound) || formatNumber(selectedDetail.threshold) || 'N/A'}
                                        </p>
                                    </div>
                                    <div className="rounded border border-nebula-navy-lighter bg-nebula-navy-dark p-3">
                                        <p className="text-xs text-slate-500">Assignment</p>
                                        <p className="text-sm text-white mt-1">{selectedDetail.assigned_email || 'Unassigned'}</p>
                                    </div>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2">
                                    <div className="rounded border border-nebula-navy-lighter bg-nebula-navy-dark p-4">
                                        <div className="flex items-center gap-2 text-slate-300">
                                            <Clock className="size-4" />
                                            <h3 className="text-sm font-medium text-white">Timing</h3>
                                        </div>
                                        <div className="grid gap-2 mt-3 text-sm">
                                            <div className="flex justify-between gap-4">
                                                <span className="text-slate-500">Detected</span>
                                                <span className="text-slate-300 text-right">{formatDateTime(selectedDetail.detected_at)}</span>
                                            </div>
                                            <div className="flex justify-between gap-4">
                                                <span className="text-slate-500">Window start</span>
                                                <span className="text-slate-300 text-right">{formatDateTime(selectedDetail.window_start)}</span>
                                            </div>
                                            <div className="flex justify-between gap-4">
                                                <span className="text-slate-500">Window end</span>
                                                <span className="text-slate-300 text-right">{formatDateTime(selectedDetail.window_end)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded border border-nebula-navy-lighter bg-nebula-navy-dark p-4">
                                        <div className="flex items-center gap-2 text-slate-300">
                                            <Fingerprint className="size-4" />
                                            <h3 className="text-sm font-medium text-white">Model</h3>
                                        </div>
                                        <div className="grid gap-2 mt-3 text-sm">
                                            <div className="flex justify-between gap-4">
                                                <span className="text-slate-500">Score</span>
                                                <span className="text-slate-300">{formatNumber(selectedDetail.score) || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between gap-4">
                                                <span className="text-slate-500">Confidence</span>
                                                <span className="text-slate-300">{formatNumber(selectedDetail.confidence) || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between gap-4">
                                                <span className="text-slate-500">Model ID</span>
                                                <span className="text-slate-300 text-right break-all">{selectedDetail.model_id || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {selectedDetail.reason_codes && selectedDetail.reason_codes.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {selectedDetail.reason_codes.map((reason) => (
                                            <span
                                                key={reason}
                                                className="px-2 py-1 rounded text-xs bg-nebula-navy-dark text-slate-300 border border-nebula-navy-lighter"
                                            >
                                                {labelText(reason)}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {featureEntries.length > 0 && (
                                    <div className="rounded border border-nebula-navy-lighter bg-nebula-navy-dark p-4">
                                        <h3 className="text-sm font-medium text-white mb-3">Feature Values</h3>
                                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                            {featureEntries.map(([key, value]) => (
                                                <div key={key} className="flex justify-between gap-3 text-xs">
                                                    <span className="text-slate-500">{labelText(key)}</span>
                                                    <span className="text-slate-300">{formatNumber(value) || String(value ?? 'N/A')}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="rounded border border-nebula-navy-lighter bg-nebula-navy-dark p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <h3 className="text-sm font-medium text-white">Feedback</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                ['true_positive', 'True'],
                                                ['false_positive', 'False'],
                                                ['expected_change', 'Expected'],
                                                ['duplicate', 'Duplicate'],
                                            ].map(([label, text]) => (
                                                <Button
                                                    key={label}
                                                    variant="outline"
                                                    onClick={() => submitFeedback(selectedDetail.anomaly_id, label as FeedbackLabel)}
                                                    className="bg-transparent border-nebula-navy-lighter text-white hover:bg-nebula-navy-lighter"
                                                >
                                                    {text}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="mt-3 space-y-2">
                                        {selectedDetail.feedback && selectedDetail.feedback.length > 0 ? (
                                            selectedDetail.feedback.map((item) => (
                                                <div key={item.feedback_id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                                    <span className="text-slate-300">{labelText(item.label)}</span>
                                                    <span className="text-slate-500">
                                                        {item.created_by_email || 'system'} · {formatDateTime(item.created_at)}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-slate-500">No feedback yet.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-400">Select an anomaly to view details.</p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Anomalies List */}
            <div className="space-y-4">
                {loading ? (
                    <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
                        <CardContent className="p-12 text-center">
                            <p className="text-slate-400">Loading anomalies...</p>
                        </CardContent>
                    </Card>
                ) : error ? (
                    <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
                        <CardContent className="p-12 text-center">
                            <AlertTriangle className="size-12 text-red-400 mx-auto mb-3" />
                            <p className="text-slate-400">{error}</p>
                        </CardContent>
                    </Card>
                ) : filteredAnomalies.length === 0 ? (
                    <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
                        <CardContent className="p-12 text-center">
                            <AlertTriangle className="size-12 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400">No anomalies found.</p>
                        </CardContent>
                    </Card>
                ) : (
                    filteredAnomalies.map((anomaly) => (
                        <Card
                            key={anomaly.id}
                            className={`bg-nebula-navy-light border-nebula-navy-lighter hover:border-nebula-purple/30 transition-all cursor-pointer ${
                                selectedAnomaly === anomaly.id ? 'border-nebula-purple/50' : ''
                            }`}
                            onClick={() => setSelectedAnomaly(anomaly.id)}
                        >
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 space-y-3">
                                        {/* Title and severity */}
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <AlertTriangle className={`size-5 ${anomaly.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'
                                                    }`} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getSeverityColor(anomaly.severity)}`}>
                                                        {anomaly.severity.toUpperCase()}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-400">
                                                        {anomaly.type}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(anomaly.status)}`}>
                                                        {anomaly.status}
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-semibold text-white mb-1">{anomaly.title}</h3>
                                                <p className="text-sm text-slate-400">{anomaly.entity}</p>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                                                    {anomaly.detector && <span>Detector: {anomaly.detector}</span>}
                                                    {anomaly.metricValue && <span>Value: {anomaly.metricValue}</span>}
                                                    {anomaly.threshold && <span>Threshold: {anomaly.threshold}</span>}
                                                    {anomaly.score && <span>Score: {anomaly.score}</span>}
                                                    {anomaly.confidence && <span>Confidence: {anomaly.confidence}</span>}
                                                    {anomaly.incidentNumber && <span>INC-{anomaly.incidentNumber}</span>}
                                                    {anomaly.suppressionReason && <span>Suppressed: {anomaly.suppressionReason}</span>}
                                                </div>
                                                {anomaly.reasonCodes && anomaly.reasonCodes.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {anomaly.reasonCodes.slice(0, 4).map((reason) => (
                                                            <span
                                                                key={reason}
                                                                className="px-2 py-0.5 rounded text-xs bg-nebula-navy-dark text-slate-400 border border-nebula-navy-lighter"
                                                            >
                                                                {reason.replace(/_/g, ' ')}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Timeline */}
                                        <div className="flex items-center gap-1">
                                            {/* Detected */}
                                            <div className="flex flex-col items-center">
                                                <div className={`w-3 h-3 rounded-full ${anomaly.status === 'detected' || anomaly.status === 'assigned' || anomaly.status === 'acknowledged' || anomaly.status === 'resolved'
                                                        ? 'bg-green-500'
                                                        : 'bg-slate-500'
                                                    }`}></div>
                                                <span className="text-xs text-slate-400 mt-1.5 whitespace-nowrap">Detected</span>
                                                <span className="text-xs text-slate-500 mt-0.5">{anomaly.detectedTime}</span>
                                            </div>

                                            {/* Line */}
                                            <div className={`h-0.5 flex-1 mx-1 ${anomaly.assignedTime ? 'bg-green-500' : 'bg-slate-600'
                                                }`}></div>

                                            {/* Assigned */}
                                            <div className="flex flex-col items-center">
                                                <div className={`w-3 h-3 rounded-full ${anomaly.assignedTime
                                                        ? 'bg-green-500'
                                                        : 'bg-slate-500'
                                                    }`}></div>
                                                <span className="text-xs text-slate-400 mt-1.5 whitespace-nowrap">Assigned</span>
                                                {anomaly.assignedTime && <span className="text-xs text-slate-500 mt-0.5">{anomaly.assignedTime}</span>}
                                            </div>

                                            {/* Line */}
                                            <div className={`h-0.5 flex-1 mx-1 ${anomaly.acknowledgedTime ? 'bg-green-500' : 'bg-slate-600'
                                                }`}></div>

                                            {/* Acknowledged */}
                                            <div className="flex flex-col items-center">
                                                <div className={`w-3 h-3 rounded-full ${anomaly.acknowledgedTime
                                                        ? 'bg-green-500'
                                                        : 'bg-slate-500'
                                                    }`}></div>
                                                <span className="text-xs text-slate-400 mt-1.5 whitespace-nowrap">Acknowledged</span>
                                                {anomaly.acknowledgedTime && <span className="text-xs text-slate-500 mt-0.5">{anomaly.acknowledgedTime}</span>}
                                            </div>

                                            {/* Line */}
                                            <div className={`h-0.5 flex-1 mx-1 ${anomaly.resolvedTime ? 'bg-green-500' : 'bg-slate-600'
                                                }`}></div>

                                            {/* Resolved */}
                                            <div className="flex flex-col items-center">
                                                <div className={`w-3 h-3 rounded-full ${anomaly.resolvedTime
                                                        ? 'bg-green-500'
                                                        : 'bg-slate-500'
                                                    }`}></div>
                                                <span className="text-xs text-slate-400 mt-1.5 whitespace-nowrap">Resolved</span>
                                                {anomaly.resolvedTime && <span className="text-xs text-slate-500 mt-0.5">{anomaly.resolvedTime}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                submitFeedback(anomaly.id, 'true_positive');
                                            }}
                                            className="bg-transparent border-nebula-navy-lighter text-white hover:bg-nebula-navy-lighter"
                                        >
                                            <Check className="size-4 mr-2" />
                                            True
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                submitFeedback(anomaly.id, 'false_positive');
                                            }}
                                            className="bg-transparent border-nebula-navy-lighter text-white hover:bg-nebula-navy-lighter"
                                        >
                                            <X className="size-4 mr-2" />
                                            False
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
