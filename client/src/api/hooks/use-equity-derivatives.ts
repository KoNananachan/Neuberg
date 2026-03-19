import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEquityDerivatives() {
  return useQuery({
    queryKey: ['equity-derivatives'],
    queryFn: () => api.get<any>('/equity-derivatives'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
