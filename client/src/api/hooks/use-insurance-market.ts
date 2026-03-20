import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useInsuranceMarket() {
  return useQuery({
    queryKey: ['insurance-market'],
    queryFn: () => api.get<any>('/insurance-market'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
