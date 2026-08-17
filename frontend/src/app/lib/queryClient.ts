import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15 * 1000, // Consider data fresh for 15 seconds
      gcTime: 5 * 60 * 1000, // Keep inactive cache for 5 minutes
      refetchOnWindowFocus: false, // Prevent jarring refetches on window focus
      retry: 1,
    },
  },
});
