import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function usePensionFund() {
  return useQuery({
    queryKey: ['pension-fund'],
    queryFn: () => api.get<any>('/pension-fund'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
