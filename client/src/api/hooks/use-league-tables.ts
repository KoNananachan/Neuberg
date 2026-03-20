import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useLeagueTables() {
  return useQuery({
    queryKey: ['league-tables'],
    queryFn: () => api.get<any>('/league-tables'),
    staleTime: 60 * 60 * 1000,
  });
}
