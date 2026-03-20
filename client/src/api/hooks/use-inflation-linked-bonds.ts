import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useInflationLinkedBonds() {
  return useQuery({
    queryKey: ['inflation-linked-bonds'],
    queryFn: () => api.get<any>('/inflation-linked-bonds'),
    staleTime: 60 * 60 * 1000,
  });
}
