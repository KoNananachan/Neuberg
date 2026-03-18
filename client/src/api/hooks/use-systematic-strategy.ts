import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSystematicStrategy() {
  return useQuery({
    queryKey: ['systematic-strategy'],
    queryFn: () => api.get<any>('/systematic-strategy'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
