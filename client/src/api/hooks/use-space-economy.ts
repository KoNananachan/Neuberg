import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSpaceEconomy() {
  return useQuery({
    queryKey: ['space-economy'],
    queryFn: () => api.get<any>('/space-economy'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
