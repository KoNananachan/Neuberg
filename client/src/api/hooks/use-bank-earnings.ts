import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useBankEarnings() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['bank-earnings'],
    queryFn: () => api.get<any>('/bank-earnings'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
