import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSpaceEconomy() {
  return useQuery({
    queryKey: ['space-economy'],
    queryFn: () => api.get<any>('/space-economy'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
