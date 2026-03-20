import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useBreakevenInflation() {
  return useQuery({
    queryKey: ['breakeven-inflation'],
    queryFn: () => api.get<any>('/breakeven-inflation'),
    staleTime: 60 * 60 * 1000,
  });
}
