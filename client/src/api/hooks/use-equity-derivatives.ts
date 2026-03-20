import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEquityDerivatives() {
  return useQuery({
    queryKey: ['equity-derivatives'],
    queryFn: () => api.get<any>('/equity-derivatives'),
    staleTime: 60 * 60 * 1000,
  });
}
