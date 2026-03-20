import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCommoditySeasonality() {
  return useQuery({
    queryKey: ['commodity-seasonality'],
    queryFn: () => api.get<any>('/commodity-seasonality'),
    staleTime: 60 * 60 * 1000,
  });
}
