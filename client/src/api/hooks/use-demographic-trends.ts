import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useDemographicTrends() {
  return useQuery({
    queryKey: ['demographic-trends'],
    queryFn: () => api.get<any>('/demographic-trends'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
