import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCreditFlow() {
  return useQuery({
    queryKey: ['credit-flow'],
    queryFn: () => api.get<any>('/credit-flow'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
