import { useEffect, useState } from 'react';

function parseHash(): { page: string; id?: string } {
  if (typeof window === 'undefined') return { page: 'dashboard' };
  const raw = window.location.hash.replace(/^#/, '').trim();
  if (!raw) return { page: 'dashboard' };
  const slash = raw.indexOf('/');
  if (slash === -1) return { page: raw };
  const page = raw.slice(0, slash);
  const id = raw.slice(slash + 1).trim();
  return { page: page || 'dashboard', id: id || undefined };
}

export function useNavigation() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | undefined>();
  const [selectedServiceId, setSelectedServiceId] = useState<number | undefined>();
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | undefined>();
  const [selectedTicketId, setSelectedTicketId] = useState<string | undefined>();
  const [selectionEpoch, setSelectionEpoch] = useState(0);

  const applyEntitySelection = (page: string, id?: string, numericId?: number) => {
    setCurrentPage(page || 'dashboard');
    if (page === 'incidents' && id) {
      setSelectedIncidentId(id);
      setSelectedAnomalyId(undefined);
      setSelectedTicketId(undefined);
      setSelectionEpoch((n) => n + 1);
    } else if (page === 'anomalies' && id) {
      setSelectedAnomalyId(id);
      setSelectedIncidentId(undefined);
      setSelectedTicketId(undefined);
      setSelectionEpoch((n) => n + 1);
    } else if (page === 'tickets' && id) {
      setSelectedTicketId(id);
      setSelectedIncidentId(undefined);
      setSelectedAnomalyId(undefined);
      setSelectionEpoch((n) => n + 1);
    } else if (typeof numericId === 'number') {
      setSelectedServiceId(numericId);
      setSelectedIncidentId(undefined);
      setSelectedTicketId(undefined);
    } else if (!id) {
      setSelectedIncidentId(undefined);
      setSelectedAnomalyId(undefined);
      setSelectedTicketId(undefined);
    }
  };

  useEffect(() => {
    const syncFromHash = () => {
      const { page, id } = parseHash();
      setCurrentPage(page);
      if (page === 'incidents' && id) {
        setSelectedIncidentId(id);
        setSelectedAnomalyId(undefined);
        setSelectedTicketId(undefined);
        setSelectionEpoch((n) => n + 1);
      } else if (page === 'anomalies' && id) {
        setSelectedAnomalyId(id);
        setSelectedIncidentId(undefined);
        setSelectedTicketId(undefined);
        setSelectionEpoch((n) => n + 1);
      } else if (page === 'tickets' && id) {
        setSelectedTicketId(id);
        setSelectedIncidentId(undefined);
        setSelectedAnomalyId(undefined);
        setSelectionEpoch((n) => n + 1);
      }
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  const handleNavigate = (page: string, id?: string | number) => {
    const nextPage = page || 'dashboard';
    const entityId = typeof id === 'string' && id ? id : undefined;
    const numericId = typeof id === 'number' ? id : undefined;

    let hashChanged = false;
    if (typeof window !== 'undefined') {
      const nextHash = entityId ? `${nextPage}/${entityId}` : nextPage;
      const currentHash = window.location.hash.replace(/^#/, '');
      if (currentHash !== nextHash) {
        window.location.hash = nextHash;
        hashChanged = true;
      }
    }

    // When the hash changed, syncFromHash will fire via the 'hashchange' listener
    // and handle selection + epoch bump. Only call applyEntitySelection directly
    // when the hash didn't change (re-selecting same entity on the same page).
    if (!hashChanged) {
      applyEntitySelection(nextPage, entityId, numericId);
    }
  };

  return {
    currentPage,
    selectedAnomalyId,
    selectedServiceId,
    selectedIncidentId,
    selectedTicketId,
    selectionEpoch,
    handleNavigate,
  };
}
