import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useEquityLinkedNotes() {
  return useQuery({
    queryKey: ['equity-linked-notes'],
    queryFn: () => api.get<any>('/equity-linked-notes'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
