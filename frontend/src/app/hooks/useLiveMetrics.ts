import { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import type { ServerMetric } from '../services/metricService';

export const useLiveMetrics = (serverId?: number) => {
  const { socket, isConnected } = useSocket();
  const [latestMetric, setLatestMetric] = useState<ServerMetric | null>(null);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewMetric = (metric: any) => {
      // metric comes from backend event 'live_server_metric'
      if (serverId && metric.server_id !== serverId) {
        return; // ignore metrics not for this server if a serverId is provided
      }
      
      const newMetric: ServerMetric = {
        recorded_at: metric.recorded_at,
        cpu_usage: metric.cpu_usage,
        memory_usage: metric.memory_usage,
        disk_usage: metric.disk_usage,
        thread_count: metric.thread_count,
      };
      
      setLatestMetric(newMetric);
    };

    socket.on('live_server_metric', handleNewMetric);

    return () => {
      socket.off('live_server_metric', handleNewMetric);
    };
  }, [socket, isConnected, serverId]);

  return latestMetric;
};
