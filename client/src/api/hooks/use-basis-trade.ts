import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useBasisTrade() {
  return useQuery({
    queryKey: ['basis-trade'],
    queryFn: () => api.get<any>('/basis-trade'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
