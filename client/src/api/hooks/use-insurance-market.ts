import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useInsuranceMarket() {
  return useQuery({
    queryKey: ['insurance-market'],
    queryFn: () => api.get<any>('/insurance-market'),
    staleTime: 60 * 60 * 1000,
  });
}
