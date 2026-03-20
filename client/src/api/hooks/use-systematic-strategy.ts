import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSystematicStrategy() {
  return useQuery({
    queryKey: ['systematic-strategy'],
    queryFn: () => api.get<any>('/systematic-strategy'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
