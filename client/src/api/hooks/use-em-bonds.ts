import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useEmBonds() {
  return useQuery({
    queryKey: ['em-bonds'],
    queryFn: () => api.get<any>('/em-bonds'),
    staleTime: 60 * 60 * 1000,
  });
}
