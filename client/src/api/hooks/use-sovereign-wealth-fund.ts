import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSovereignWealthFund() {
  return useQuery({
    queryKey: ['sovereign-wealth-fund'],
    queryFn: () => api.get<any>('/sovereign-wealth-fund'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
