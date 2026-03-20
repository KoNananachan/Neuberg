import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebtIssuance() {
  return useQuery({
    queryKey: ['debt-issuance'],
    queryFn: () => api.get<any>('/debt-issuance'),
    staleTime: 60 * 60 * 1000,
  });
}
