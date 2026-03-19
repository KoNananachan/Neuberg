import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useBreakevenInflation() {
  return useQuery({
    queryKey: ['breakeven-inflation'],
    queryFn: () => api.get<any>('/breakeven-inflation'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
