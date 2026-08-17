import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds fresh cache before background revalidation
      gcTime: 5 * 60 * 1000, // 5 minutes garbage collection retention
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
