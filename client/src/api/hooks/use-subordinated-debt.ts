import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSubordinatedDebt() {
  return useQuery({
    queryKey: ['subordinated-debt'],
    queryFn: () => api.get<any>('/subordinated-debt'),
    staleTime: 60 * 60 * 1000,
  });
}
