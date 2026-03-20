import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useFiRelativeValue() {
  return useQuery({
    queryKey: ['fi-relative-value'],
    queryFn: () => api.get<any>('/fi-relative-value'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
