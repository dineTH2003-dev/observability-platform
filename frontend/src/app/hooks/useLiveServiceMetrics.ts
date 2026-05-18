import { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import type { ServiceMetric } from '../services/serviceMetricService';

export const useLiveServiceMetrics = (serviceId?: number) => {
  const { socket, isConnected } = useSocket();
  const [latestMetric, setLatestMetric] = useState<ServiceMetric | null>(null);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewMetric = (metric: any) => {
      if (serviceId && metric.service_id !== serviceId) {
        return;
      }

      const newMetric: ServiceMetric = {
        recorded_at: metric.recorded_at,
        cpu_usage: Number(metric.cpu_usage) || 0,
        memory_usage: Number(metric.memory_usage) || 0,
        disk_usage: Number(metric.disk_usage) || 0,
        thread_count: Number(metric.thread_count) || 0,
      };

      setLatestMetric(newMetric);
    };

    socket.on('live_service_metric', handleNewMetric);

    return () => {
      socket.off('live_service_metric', handleNewMetric);
    };
  }, [socket, isConnected, serviceId]);

  return latestMetric;
};
