import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSpaceEconomy() {
  return useQuery({
    queryKey: ['space-economy'],
    queryFn: () => api.get<any>('/space-economy'),
    staleTime: 60 * 60 * 1000,
  });
}
