import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useInterestRateSwap() {
  return useQuery({
    queryKey: ['interest-rate-swap'],
    queryFn: () => api.get<any>('/interest-rate-swap'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
