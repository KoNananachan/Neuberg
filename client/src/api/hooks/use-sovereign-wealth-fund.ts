import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSovereignWealthFund() {
  return useQuery({
    queryKey: ['sovereign-wealth-fund'],
    queryFn: () => api.get<any>('/sovereign-wealth-fund'),
    staleTime: 60 * 60 * 1000,
  });
}
