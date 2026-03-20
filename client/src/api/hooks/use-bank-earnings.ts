import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useBankEarnings() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['bank-earnings'],
    queryFn: () => api.get<any>('/bank-earnings'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
