import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useLaborMarket() {
  return useQuery({
    queryKey: ['labor-market'],
    queryFn: () => api.get<any>('/labor-market'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
