import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebtIssuance() {
  return useQuery({
    queryKey: ['debt-issuance'],
    queryFn: () => api.get<any>('/debt-issuance'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
