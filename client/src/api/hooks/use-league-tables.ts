import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useLeagueTables() {
  return useQuery({
    queryKey: ['league-tables'],
    queryFn: () => api.get<any>('/league-tables'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
