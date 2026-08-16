import { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';

interface AnomalyEvent {
  anomaly_id: string;
  status?: string;
  resolved_at?: string | null;
  action?: string;
  // createFromMlDetection sends the full anomaly row
  [key: string]: unknown;
}

/**
 * Subscribe to real-time anomaly lifecycle events via Socket.io.
 *
 * Returns two pieces of state:
 * - `newAnomaly`: the latest anomaly_created payload (new ML detection)
 * - `updatedAnomaly`: the latest anomaly_updated payload (status change / feedback)
 *
 * The consuming component merges these into its own list state.
 */
export const useLiveAnomalies = () => {
  const { socket, isConnected } = useSocket();
  const [newAnomaly, setNewAnomaly] = useState<AnomalyEvent | null>(null);
  const [updatedAnomaly, setUpdatedAnomaly] = useState<AnomalyEvent | null>(null);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleCreated = (data: AnomalyEvent) => {
      setNewAnomaly(data);
    };

    const handleUpdated = (data: AnomalyEvent) => {
      setUpdatedAnomaly(data);
    };

    socket.on('anomaly_created', handleCreated);
    socket.on('anomaly_updated', handleUpdated);

    return () => {
      socket.off('anomaly_created', handleCreated);
      socket.off('anomaly_updated', handleUpdated);
    };
  }, [socket, isConnected]);

  return { newAnomaly, updatedAnomaly };
};
