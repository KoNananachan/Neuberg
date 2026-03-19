import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useInfrastructureInvestment() {
  return useQuery({
    queryKey: ['infrastructure-investment'],
    queryFn: () => api.get<any>('/infrastructure-investment'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
