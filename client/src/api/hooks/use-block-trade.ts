import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useBlockTrade() {
  return useQuery({
    queryKey: ['block-trade'],
    queryFn: () => api.get<any>('/block-trade'),
    staleTime: 60 * 60 * 1000,
  });
}
