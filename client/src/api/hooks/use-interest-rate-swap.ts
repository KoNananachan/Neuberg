import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useInterestRateSwap() {
  return useQuery({
    queryKey: ['interest-rate-swap'],
    queryFn: () => api.get<any>('/interest-rate-swap'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
