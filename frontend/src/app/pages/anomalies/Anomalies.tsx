import { useState } from 'react';
import { Search, AlertTriangle, Check } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';

interface Anomaly {
    id: string;
    severity: string;
    entity: string;
    type: string;
    title: string;
    detectedTime: string;
    assignedTime?: string;
    acknowledgedTime?: string;
    resolvedTime?: string;
    status: 'detected' | 'assigned' | 'acknowledged' | 'resolved';
}

interface AnomaliesProps {
    selectedAnomalyId?: string;
}

export function Anomalies({ selectedAnomalyId }: AnomaliesProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAnomaly, setSelectedAnomaly] = useState<string | null>(selectedAnomalyId || null);

    const anomalies: Anomaly[] = [
        {
            id: 'ano-001',
            severity: 'critical',
            entity: 'prod-db-01 / User Service',
            type: 'Host',
            title: 'High CPU utilization on prod-db-01',
            detectedTime: '2h 34m',
            status: 'detected',
        },
        {
            id: 'ano-002',
            severity: 'warning',
            entity: 'API Gateway / gateway',
            type: 'Application',
            title: 'Memory leak detected in API Gateway',
            detectedTime: '45m',
            assignedTime: '40m',
            status: 'assigned',
        },
        {
            id: 'ano-003',
            severity: 'critical',
            entity: 'Payment Service / payment-db',
            type: 'Service',
            title: 'Database connection pool exhausted',
            detectedTime: '1h 12m',
            assignedTime: '1h',
            acknowledgedTime: '50m',
            status: 'acknowledged',
        },
        {
            id: 'ano-004',
            severity: 'warning',
            entity: 'Auth Service / auth-api',
            type: 'Application',
            title: 'Elevated error rate in authentication',
            detectedTime: '28m',
            status: 'detected',
        },
    ];

    const filteredAnomalies = anomalies.filter(anomaly =>
        anomaly.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        anomaly.entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        anomaly.status.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical':
                return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'warning':
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

            {/* Anomalies List */}
            <div className="space-y-4">
                {filteredAnomalies.length === 0 ? (
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
                            className="bg-nebula-navy-light border-nebula-navy-lighter hover:border-nebula-purple/30 transition-all cursor-pointer"
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
                                            className="bg-transparent border-nebula-navy-lighter text-white hover:bg-nebula-navy-lighter"
                                        >
                                            View Details
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