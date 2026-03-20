import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEquityDerivatives() {
  return useQuery({
    queryKey: ['equity-derivatives'],
    queryFn: () => api.get<any>('/equity-derivatives'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
