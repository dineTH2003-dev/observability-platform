import { api } from "./api";

export interface DashboardSummary {
  kpis: {
    hosts: number;
    applications: number;
    services: number;
    activeAnomalies: number;
    openIncidents: number;
    systemHealth: number;
  };
  openIncidents: {
    id: string;
    title: string;
    severity: string;
    status: string;
    assignedTo: string;
    duration: string;
    hasRecommendation: boolean;
  }[];
  topAffectedResources: {
    name: string;
    health: number;
    status: string;
    anomalyCount: number;
  }[];
  metricsOverview: {
    time: string;
    avg_cpu: number;
    avg_memory: number;
    avg_disk: number;
    avg_thread_count: number;
  }[];
  anomalyTrend: {
    time: string;
    anomalies: number;
  }[];
}

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const response = await api.get<{ success: boolean; data: DashboardSummary }>("/dashboard/summary");
  return response.data;
};
