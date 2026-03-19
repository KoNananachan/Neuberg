import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useInfrastructureDebt() {
  return useQuery({
    queryKey: ['infrastructure-debt'],
    queryFn: () => api.get<any>('/infrastructure-debt'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
