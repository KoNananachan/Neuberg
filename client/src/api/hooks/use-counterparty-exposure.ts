import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCounterpartyExposure() {
  return useQuery({
    queryKey: ['counterparty-exposure'],
    queryFn: () => api.get<any>('/counterparty-exposure'),
    staleTime: 60 * 60 * 1000,
  });
}
