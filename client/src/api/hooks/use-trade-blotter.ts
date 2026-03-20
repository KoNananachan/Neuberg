import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useTradeBlotter() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['trade-blotter'],
    queryFn: () => api.get<any>('/trade-blotter'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
