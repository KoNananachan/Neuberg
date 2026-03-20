import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFundFlowTracker() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['fund-flow-tracker'],
    queryFn: () => api.get<any>('/fund-flow-tracker'),
    staleTime: 60 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
