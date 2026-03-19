import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useTradeExecutionQuality() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['trade-execution-quality'],
    queryFn: () => api.get<any>('/trade-execution-quality'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
