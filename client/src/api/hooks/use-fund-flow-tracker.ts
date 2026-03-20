import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFundFlowTracker() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['fund-flow-tracker'],
    queryFn: () => api.get<any>('/fund-flow-tracker'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
