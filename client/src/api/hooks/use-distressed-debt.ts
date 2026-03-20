import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useDistressedDebt() {
  return useQuery({
    queryKey: ['distressed-debt'],
    queryFn: () => api.get<any>('/distressed-debt'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
