import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useWaterMarket() {
  return useQuery({
    queryKey: ['water-market'],
    queryFn: () => api.get<any>('/water-market'),
    staleTime: 60 * 60 * 1000,
  });
}
