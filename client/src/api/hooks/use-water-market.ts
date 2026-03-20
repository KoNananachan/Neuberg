import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useWaterMarket() {
  return useQuery({
    queryKey: ['water-market'],
    queryFn: () => api.get<any>('/water-market'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
