import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSubordinatedDebt() {
  return useQuery({
    queryKey: ['subordinated-debt'],
    queryFn: () => api.get<any>('/subordinated-debt'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
