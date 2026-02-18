import { useState } from 'react';

export function useNavigation() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | undefined>();
  const [selectedServiceId, setSelectedServiceId] = useState<number | undefined>();

  const handleNavigate = (page: string, id?: string | number) => {
    setCurrentPage(page);
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
