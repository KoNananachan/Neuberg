import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useElectricityMarket() {
  return useQuery({
    queryKey: ['electricity-market'],
    queryFn: () => api.get<any>('/electricity-market'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
