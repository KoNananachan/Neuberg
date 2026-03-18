import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCreditDefaultIndex() {
  return useQuery({
    queryKey: ['credit-default-index'],
    queryFn: () => api.get<any>('/credit-default-index'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
