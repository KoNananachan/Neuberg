import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useInfrastructureInvestment() {
  return useQuery({
    queryKey: ['infrastructure-investment'],
    queryFn: () => api.get<any>('/infrastructure-investment'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
