import { useEffect, useState } from 'react';

function getPageFromHash() {
  if (typeof window === 'undefined') return 'dashboard';
  const hash = window.location.hash.replace('#', '').trim();
  return hash || 'dashboard';
}

export function useNavigation() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | undefined>();
  const [selectedServiceId, setSelectedServiceId] = useState<number | undefined>();

  useEffect(() => {
    const syncPage = () => {
      setCurrentPage(getPageFromHash());
    };
    syncPage();
    window.addEventListener('hashchange', syncPage);
    return () => window.removeEventListener('hashchange', syncPage);
  }, []);

  const handleNavigate = (page: string, id?: string | number) => {
    const nextPage = page || 'dashboard';
    setCurrentPage(nextPage);
    if (typeof window !== 'undefined') {
      window.location.hash = nextPage;
    }
    if (typeof id === 'string') {
      setSelectedAnomalyId(id);
    } else if (typeof id === 'number') {
      setSelectedServiceId(id);
    }
  };

  return {
    currentPage,
    selectedAnomalyId,
    selectedServiceId,
    handleNavigate,
  };
}
