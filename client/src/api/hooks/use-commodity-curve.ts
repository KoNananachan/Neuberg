import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCommodityCurve() {
  return useQuery({
    queryKey: ['commodity-curve'],
    queryFn: () => api.get<any>('/commodity-curve'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
