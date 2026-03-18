import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useMarketImpactModel() {
  return useQuery({
    queryKey: ['market-impact-model'],
    queryFn: () => api.get<any>('/market-impact-model'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
