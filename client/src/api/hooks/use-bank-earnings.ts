import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useBankEarnings() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['bank-earnings'],
    queryFn: () => api.get<any>('/bank-earnings'),
    staleTime: 60 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
