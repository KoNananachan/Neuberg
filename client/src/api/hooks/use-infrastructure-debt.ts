import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useInfrastructureDebt() {
  return useQuery({
    queryKey: ['infrastructure-debt'],
    queryFn: () => api.get<any>('/infrastructure-debt'),
    staleTime: 60 * 60 * 1000,
  });
}
