import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCreditIndexTranches() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['credit-index-tranches'],
    queryFn: () => api.get<any>('/credit-index-tranches'),
    staleTime: 60 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
