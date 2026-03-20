import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useDemographicTrends() {
  return useQuery({
    queryKey: ['demographic-trends'],
    queryFn: () => api.get<any>('/demographic-trends'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
