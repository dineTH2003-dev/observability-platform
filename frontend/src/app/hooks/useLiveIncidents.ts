import { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';

interface IncidentEvent {
  incident_id: string;
  incident_number?: number;
  title?: string;
  severity?: string;
  status?: string;
  assigned_to?: string | null;
  assigned_email?: string | null;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  action?: string;
  [key: string]: unknown;
}

/**
 * Subscribe to real-time incident lifecycle events via Socket.io.
 *
 * Returns two pieces of state:
 * - `newIncident`: the latest incident_created payload
 * - `updatedIncident`: the latest incident_updated payload (assign / ack / resolve)
 *
 * The consuming component merges these into its own list state.
 */
export const useLiveIncidents = () => {
  const { socket, isConnected } = useSocket();
  const [newIncident, setNewIncident] = useState<IncidentEvent | null>(null);
  const [updatedIncident, setUpdatedIncident] = useState<IncidentEvent | null>(null);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleCreated = (data: IncidentEvent) => {
      setNewIncident(data);
    };

    const handleUpdated = (data: IncidentEvent) => {
      setUpdatedIncident(data);
    };

    socket.on('incident_created', handleCreated);
    socket.on('incident_updated', handleUpdated);

    return () => {
      socket.off('incident_created', handleCreated);
      socket.off('incident_updated', handleUpdated);
    };
  }, [socket, isConnected]);

  return { newIncident, updatedIncident };
};
