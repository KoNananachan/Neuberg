import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useBreakevenInflation() {
  return useQuery({
    queryKey: ['breakeven-inflation'],
    queryFn: () => api.get<any>('/breakeven-inflation'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
