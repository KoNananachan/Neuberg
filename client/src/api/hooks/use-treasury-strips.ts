import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useTreasuryStrips() {
  return useQuery({
    queryKey: ['treasury-strips'],
    queryFn: () => api.get<any>('/treasury-strips'),
    refetchInterval: 300000,
    staleTime: 180000,
  });
}
