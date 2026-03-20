import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCryptoDerivatives() {
  return useQuery({
    queryKey: ['crypto-derivatives'],
    queryFn: () => api.get<any>('/crypto-derivatives'),
    staleTime: 60 * 60 * 1000,
  });
}
