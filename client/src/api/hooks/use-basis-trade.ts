import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useBasisTrade() {
  return useQuery({
    queryKey: ['basis-trade'],
    queryFn: () => api.get<any>('/basis-trade'),
    staleTime: 60 * 60 * 1000,
  });
}
