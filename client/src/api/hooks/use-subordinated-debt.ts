import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSubordinatedDebt() {
  return useQuery({
    queryKey: ['subordinated-debt'],
    queryFn: () => api.get<any>('/subordinated-debt'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
