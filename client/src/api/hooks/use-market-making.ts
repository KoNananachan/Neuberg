import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useMarketMaking() {
  return useQuery({
    queryKey: ['market-making'],
    queryFn: () => api.get<any>('/market-making'),
    staleTime: 60 * 60 * 1000,
  });
}
