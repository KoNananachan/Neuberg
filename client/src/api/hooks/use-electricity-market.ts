import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useElectricityMarket() {
  return useQuery({
    queryKey: ['electricity-market'],
    queryFn: () => api.get<any>('/electricity-market'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
