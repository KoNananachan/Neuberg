import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCrossBorderMa() {
  return useQuery({
    queryKey: ['cross-border-ma'],
    queryFn: () => api.get<any>('/cross-border-ma'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
