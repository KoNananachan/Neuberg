import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useStructuredNotes() {
  return useQuery({
    queryKey: ['structured-notes'],
    queryFn: () => api.get<any>('/structured-notes'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
