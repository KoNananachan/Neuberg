import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useTradeBlotter() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['trade-blotter'],
    queryFn: () => api.get<any>('/trade-blotter'),
    staleTime: 60 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
