import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useTradeExecutionQuality() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['trade-execution-quality'],
    queryFn: () => api.get<any>('/trade-execution-quality'),
    staleTime: 60 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
