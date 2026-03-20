import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useStructuredNotes() {
  return useQuery({
    queryKey: ['structured-notes'],
    queryFn: () => api.get<any>('/structured-notes'),
    staleTime: 60 * 60 * 1000,
  });
}
