import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useInfrastructureInvestment() {
  return useQuery({
    queryKey: ['infrastructure-investment'],
    queryFn: () => api.get<any>('/infrastructure-investment'),
    staleTime: 60 * 60 * 1000,
  });
}
