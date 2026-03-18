import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebtCeiling() {
  return useQuery({
    queryKey: ['debt-ceiling'],
    queryFn: () => api.get<any>('/debt-ceiling'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
