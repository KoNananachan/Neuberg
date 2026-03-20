import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useFundFlowAnalytics() {
  return useQuery({
    queryKey: ['fund-flow-analytics'],
    queryFn: () => api.get<any>('/fund-flow-analytics'),
    staleTime: 60 * 60 * 1000,
  });
}
