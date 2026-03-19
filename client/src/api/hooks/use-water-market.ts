import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useWaterMarket() {
  return useQuery({
    queryKey: ['water-market'],
    queryFn: () => api.get<any>('/water-market'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
