import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useDemographicTrends() {
  return useQuery({
    queryKey: ['demographic-trends'],
    queryFn: () => api.get<any>('/demographic-trends'),
    staleTime: 60 * 60 * 1000,
  });
}
