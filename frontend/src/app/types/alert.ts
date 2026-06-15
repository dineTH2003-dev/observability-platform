export interface AlertRule {
    id: string;
    name: string;
    condition: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    threshold?: string;
    duration: string;
    enabled: boolean;
    recipients: string[];
    scope: string;
    cooldown: string;
    sendOnce: boolean;
}

export const conditionOptions = [
    { value: 'system_health_critical', label: 'System Health = Critical' },
    { value: 'system_health_degraded', label: 'System Health = Degraded' },
    { value: 'anomaly_critical', label: 'Critical Anomaly Detected' },
    { value: 'anomaly_high_severity', label: 'High-Severity Anomaly Detected' },
    { value: 'service_unavailable', label: 'Service Unavailable for > X minutes' },
    { value: 'agent_disconnected', label: 'Agent Disconnected' },
    { value: 'error_rate_high', label: 'Error Rate Exceeds Threshold' },
    { value: 'latency_high', label: 'Latency Exceeds Threshold' },
];

export const getSeverityColor = (severity: string) => {
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
